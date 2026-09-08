from django.urls import path
from django.contrib.auth import views as auth_views
from . import views
from .views import custom_logout_view
from .apiview import (
    ChannelListAPIView, YouTubeChannelCreateAPIView,
    MediaFileListAPIView, MediaFileDetailAPIView,
    AudioFileListAPIView,
    ArtistListAPIView, ArtistDetailAPIView, ArtistAudiosAPIView,
    AllLocalTracksAPIView, SearchLocalTracksAPIView,
    PlaylistListCreateAPIView, PlaylistDetailAPIView, PlaylistTrackAddRemoveAPIView,
    FavoriteTrackListAPIView, FavoriteTrackToggleAPIView,
    ListeningHistoryAPIView,
    FollowedArtistListAPIView, FollowArtistToggleAPIView, CheckFollowedArtistAPIView,
)

urlpatterns = [
    # ── Web routes ─────────────────────────────────────────────────────────────
    path('', views.channel_list, name='channel_list'),
    path('add/', views.add_channel, name='add_channel'),
    path('<int:channel_id>/media/', views.media_list, name='media_list'),
    path('audio/', views.audio_list, name='audio_list'),

    # ── Authentication ─────────────────────────────────────────────────────────
    path('login/', auth_views.LoginView.as_view(template_name='downloader/login.html'), name='login'),
    path('logout/', custom_logout_view, name='custom-logout'),

    # ── REST API: channels ─────────────────────────────────────────────────────
    path('api/channels/', ChannelListAPIView.as_view(), name='api_channel_list'),
    path('api/channels/create/', YouTubeChannelCreateAPIView.as_view(), name='api_create_channel'),
    path('api/channels/<int:channel_id>/media/', MediaFileListAPIView.as_view(), name='api_media_list'),
    path('api/media/<int:pk>/', MediaFileDetailAPIView.as_view(), name='api_media_detail'),
    path('api/audio/', AudioFileListAPIView.as_view(), name='api_audio_list'),

    # ── REST API: artists (channels with ≥1 downloaded audio) ─────────────────
    path('api/artists/', ArtistListAPIView.as_view(), name='api_artist_list'),
    path('api/artists/<int:pk>/', ArtistDetailAPIView.as_view(), name='api_artist_detail'),
    path('api/artists/<int:artist_id>/audios/', ArtistAudiosAPIView.as_view(), name='api_artist_audios'),

    # ── REST API: flat track list + search ────────────────────────────────────
    path('api/tracks/', AllLocalTracksAPIView.as_view(), name='api_all_tracks'),
    path('api/tracks/search/', SearchLocalTracksAPIView.as_view(), name='api_search_tracks'),

    # ── REST API: Playlists ────────────────────────────────────────────────────
    path('api/playlists/', PlaylistListCreateAPIView.as_view(), name='api_playlist_list_create'),
    path('api/playlists/<int:pk>/', PlaylistDetailAPIView.as_view(), name='api_playlist_detail'),
    path('api/playlists/<int:pk>/tracks/', PlaylistTrackAddRemoveAPIView.as_view(), name='api_playlist_track_add_remove'),

    # ── REST API: Favorites & History ──────────────────────────────────────────
    path('api/favorites/', FavoriteTrackListAPIView.as_view(), name='api_favorite_list'),
    path('api/favorites/toggle/', FavoriteTrackToggleAPIView.as_view(), name='api_favorite_toggle'),
    path('api/history/', ListeningHistoryAPIView.as_view(), name='api_history'),

    # ── REST API: Followed Artists ─────────────────────────────────────────────
    path('api/following/artists/', FollowedArtistListAPIView.as_view(), name='api_followed_artists_list'),
    path('api/following/artists/toggle/', FollowArtistToggleAPIView.as_view(), name='api_follow_artist_toggle'),
    path('api/following/artists/contains/', CheckFollowedArtistAPIView.as_view(), name='api_check_followed_artists'),
]

