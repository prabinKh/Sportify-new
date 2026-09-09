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
