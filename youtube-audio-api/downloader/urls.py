from django.urls import path
from django.contrib.auth import views as auth_views
from . import views
from .views import custom_logout_view
from .apiview import *

urlpatterns = [
    # Web routes
    path('', views.channel_list, name='channel_list'),
    path('add/', views.add_channel, name='add_channel'),
    path('<int:channel_id>/media/', views.media_list, name='media_list'),
path('audio/', views.audio_list, name='audio_list'),
    # Authentication URLs
    path('login/', auth_views.LoginView.as_view(template_name='downloader/login.html'), name='login'),
    path('logout/', custom_logout_view, name='custom-logout'),
        # API routes
    path('api/channels/', ChannelListAPIView.as_view(), name='api_channel_list'),
    path('api/channels/create/', YouTubeChannelCreateAPIView.as_view(), name='api_create_channel'),
    path('api/channels/<int:channel_id>/media/', MediaFileListAPIView.as_view(), name='api_media_list'),
    path('api/media/<int:pk>/', MediaFileDetailAPIView.as_view(), name='api_media_detail'),
    path('api/audio/', AudioFileListAPIView.as_view(), name='api_audio_list'),
    # Artist APIs (only channels with audio)
    path('api/artists/', ArtistListAPIView.as_view(), name='api_artist_list'),
    path('api/artists/<int:pk>/', ArtistDetailAPIView.as_view(), name='api_artist_detail'),
    path('api/artists/<int:artist_id>/audios/', ArtistAudiosAPIView.as_view(), name='api_artist_audios'),
]

    

