import os
import uuid
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from .models import UserProfile
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            password = serializer.validated_data['password']
            email = serializer.validated_data.get('email', '')
            display_name = serializer.validated_data.get('display_name', '') or username

            user = User.objects.create_user(username=username, email=email, password=password)
            UserProfile.objects.create(user=user, display_name=display_name)

            token, _ = Token.objects.get_or_create(user=user)
            login(request, user)

            return Response({
                'message': 'User registered successfully',
                'token': token.key,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            username = serializer.validated_data['username']
            password = serializer.validated_data['password']

            # Allow login with email or username
            if '@' in username:
                user_obj = User.objects.filter(email=username).first()
                if user_obj:
                    username = user_obj.username

            user = authenticate(request, username=username, password=password)
            if user:
                UserProfile.objects.get_or_create(user=user, defaults={'display_name': user.username})
                token, _ = Token.objects.get_or_create(user=user)
                login(request, user)

                return Response({
                    'message': 'Login successful',
                    'token': token.key,
                    'user': UserSerializer(user).data
                }, status=status.HTTP_200_OK)

            return Response({'error': 'Invalid username/email or password.'}, status=status.HTTP_401_UNAUTHORIZED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if request.user.is_authenticated:
            Token.objects.filter(user=request.user).delete()
            logout(request)
        return Response({'message': 'Logged out successfully'}, status=status.HTTP_200_OK)

class MeView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if request.user.is_authenticated:
            UserProfile.objects.get_or_create(user=request.user, defaults={'display_name': request.user.username})
            return Response(UserSerializer(request.user).data)

        return Response({
            'id': 'guest',
            'username': 'guest',
            'display_name': 'Guest Listener',
            'email': 'guest@sportify.local',
            'images': [{'url': 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png'}]
        })

    def patch(self, request):
        if not request.user.is_authenticated:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user, defaults={'display_name': user.username})

        data = request.data

        # Update display name
        if 'display_name' in data and data['display_name'].strip():
            profile.display_name = data['display_name'].strip()

        # Update avatar URL
        if 'avatar_url' in data and data['avatar_url'].strip():
            profile.avatar_url = data['avatar_url'].strip()

        # Handle uploaded file
        if 'avatar' in request.FILES:
            avatar_file = request.FILES['avatar']
            ext = os.path.splitext(avatar_file.name)[1]
            filename = f"avatar_{user.id}_{uuid.uuid4().hex[:8]}{ext}"
            avatar_dir = os.path.join(settings.MEDIA_ROOT, 'avatars')
            os.makedirs(avatar_dir, exist_ok=True)
            file_path = os.path.join(avatar_dir, filename)

            with open(file_path, 'wb+') as destination:
                for chunk in avatar_file.chunks():
                    destination.write(chunk)

            profile.avatar_url = f"/media/avatars/{filename}"

        # Update email
        if 'email' in data:
            user.email = data['email'].strip()
            user.save(update_fields=['email'])

        profile.save()

        return Response({
            'message': 'Profile updated successfully',
            'user': UserSerializer(user).data
        })

    def put(self, request):
        return self.patch(request)

class PublicUserDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, user_id):
        # Look up by ID or username
        user = None
        if user_id.isdigit():
            user = User.objects.filter(id=int(user_id)).first()
        if not user:
            user = User.objects.filter(username=user_id).first()

        if user:
            UserProfile.objects.get_or_create(user=user, defaults={'display_name': user.username})
            return Response(UserSerializer(user).data)

        # Fallback guest profile if not found
        return Response({
            'id': str(user_id),
            'username': str(user_id),
            'display_name': str(user_id).capitalize(),
            'images': [{'url': 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png'}]
        })
