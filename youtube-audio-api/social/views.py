from django.contrib.auth.models import User
from django.db import models as dm
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from .models import FriendRequest, DirectMessage
from .serializers import (
    UserSummarySerializer, FriendRequestSerializer, DirectMessageSerializer
)


class UserSearchView(APIView):
    """GET /api/social/users/search/?q=username"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 1:
            return Response([])
        users = User.objects.filter(
            dm.Q(username__icontains=q) |
            dm.Q(first_name__icontains=q) |
            dm.Q(last_name__icontains=q)
        ).exclude(id=request.user.id)[:20]

        results = []
        for user in users:
            data = UserSummarySerializer(user, context={'request': request}).data
            # Add friendship status
            fr = FriendRequest.objects.filter(
                dm.Q(sender=request.user, receiver=user) |
                dm.Q(sender=user, receiver=request.user)
            ).first()
            if fr:
                if fr.status == 'accepted':
                    data['friend_status'] = 'friends'
                elif fr.status == 'pending':
                    data['friend_status'] = 'pending_sent' if fr.sender == request.user else 'pending_received'
                    data['request_id'] = fr.id
                else:
                    data['friend_status'] = 'none'
            else:
                data['friend_status'] = 'none'
            results.append(data)

        return Response(results)


class FriendListView(APIView):
    """GET /api/social/friends/ — list accepted friends"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        accepted = FriendRequest.objects.filter(
            status='accepted'
        ).filter(
            dm.Q(sender=request.user) | dm.Q(receiver=request.user)
        ).select_related('sender', 'receiver')

        friends = []
        for fr in accepted:
            friend = fr.receiver if fr.sender == request.user else fr.sender
            data = UserSummarySerializer(friend, context={'request': request}).data
            # Unread DM count from this friend
            unread = DirectMessage.objects.filter(
                sender=friend, receiver=request.user, read=False
            ).count()
            data['unread_messages'] = unread
            data['request_id'] = fr.id
            friends.append(data)

        return Response(friends)


class FriendRequestListCreateView(APIView):
    """
    GET  /api/social/requests/ — incoming pending requests
    POST /api/social/requests/ — send a request {to_user_id}
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pending = FriendRequest.objects.filter(
            receiver=request.user, status='pending'
        ).select_related('sender', 'sender__profile')
        return Response(FriendRequestSerializer(pending, many=True, context={'request': request}).data)

    def post(self, request):
        to_id = request.data.get('to_user_id')
        if not to_id:
            return Response({'error': 'to_user_id required'}, status=400)
        try:
            receiver = User.objects.get(pk=to_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        if receiver == request.user:
            return Response({'error': 'Cannot send request to yourself'}, status=400)

        # Check existing
        existing = FriendRequest.objects.filter(
            dm.Q(sender=request.user, receiver=receiver) |
            dm.Q(sender=receiver, receiver=request.user)
        ).first()
        if existing:
            if existing.status == 'accepted':
                return Response({'error': 'Already friends'}, status=400)
            if existing.status == 'pending':
                return Response({'error': 'Request already pending'}, status=400)
            # Rejected — allow re-sending by resetting
            existing.status = 'pending'
            existing.sender = request.user
            existing.receiver = receiver
            existing.save()
            return Response(FriendRequestSerializer(existing, context={'request': request}).data, status=200)

        fr = FriendRequest.objects.create(sender=request.user, receiver=receiver)
        return Response(FriendRequestSerializer(fr, context={'request': request}).data, status=201)


class FriendRequestActionView(APIView):
    """PATCH /api/social/requests/{id}/ — accept or reject"""
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            fr = FriendRequest.objects.get(pk=pk, receiver=request.user)
        except FriendRequest.DoesNotExist:
            return Response({'error': 'Request not found'}, status=404)

        action = request.data.get('action')
        if action == 'accept':
            fr.status = 'accepted'
            fr.save()
            return Response(FriendRequestSerializer(fr, context={'request': request}).data)
        elif action == 'reject':
            fr.status = 'rejected'
            fr.save()
            return Response(FriendRequestSerializer(fr, context={'request': request}).data)
        return Response({'error': 'action must be accept or reject'}, status=400)

    def delete(self, request, pk):
        """Remove a friendship / cancel a request"""
        try:
            fr = FriendRequest.objects.get(
                pk=pk
            ).filter(
                dm.Q(sender=request.user) | dm.Q(receiver=request.user)
            ).first()
            if fr:
                fr.delete()
        except FriendRequest.DoesNotExist:
            pass
        return Response(status=204)


class DirectMessageConversationView(APIView):
    """
    GET  /api/social/messages/{user_id}/ — get conversation (must be friends)
    POST /api/social/messages/{user_id}/ — send a DM
    """
    permission_classes = [IsAuthenticated]

    def _get_friend_or_403(self, request, user_id):
        try:
            other = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None, Response({'error': 'User not found'}, status=404)

        if not FriendRequest.are_friends(request.user, other):
            return None, Response(
                {'error': 'You must be friends to message this user'},
                status=403
            )
        return other, None

    def get(self, request, user_id):
        other, err = self._get_friend_or_403(request, user_id)
        if err:
            return err

        messages = DirectMessage.objects.filter(
            dm.Q(sender=request.user, receiver=other) |
            dm.Q(sender=other, receiver=request.user)
        ).order_by('created_at')

        # Mark incoming as read
        DirectMessage.objects.filter(
            sender=other, receiver=request.user, read=False
        ).update(read=True)

        return Response(DirectMessageSerializer(messages, many=True, context={'request': request}).data)

    def post(self, request, user_id):
        other, err = self._get_friend_or_403(request, user_id)
        if err:
            return err

        text = (request.data.get('text') or '').strip()
        if not text:
            return Response({'error': 'Message text required'}, status=400)

        msg = DirectMessage.objects.create(
            sender=request.user,
            receiver=other,
            text=text
        )
        return Response(DirectMessageSerializer(msg, context={'request': request}).data, status=201)


class ConversationListView(APIView):
    """GET /api/social/conversations/ — list all DM conversations (friends with messages)"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get all friends
        accepted = FriendRequest.objects.filter(
            status='accepted'
        ).filter(
            dm.Q(sender=request.user) | dm.Q(receiver=request.user)
        )

        results = []
        for fr in accepted:
            friend = fr.receiver if fr.sender == request.user else fr.sender
            # Last message between them
            last_msg = DirectMessage.objects.filter(
                dm.Q(sender=request.user, receiver=friend) |
                dm.Q(sender=friend, receiver=request.user)
            ).order_by('-created_at').first()

            unread = DirectMessage.objects.filter(
                sender=friend, receiver=request.user, read=False
            ).count()

            friend_data = UserSummarySerializer(friend, context={'request': request}).data
            friend_data['last_message'] = DirectMessageSerializer(last_msg, context={'request': request}).data if last_msg else None
            friend_data['unread_count'] = unread
            results.append(friend_data)

        # Sort: conversations with messages first, then by last_message time
        results.sort(key=lambda x: (
            x['last_message']['created_at'] if x['last_message'] else '0000'
        ), reverse=True)

        return Response(results)
