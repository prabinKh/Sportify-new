from django.urls import path
from .views import (
    RoomListCreateAPIView,
    JoinRoomAPIView,
    RoomDetailAPIView,
    RoomPlaybackSyncAPIView,
    RoomStateSyncAPIView,
    RoomChatAPIView,
    LeaveRoomAPIView,
    get_server_time,
)

urlpatterns = [
    path('time/', get_server_time, name='server_time'),
    path('', RoomListCreateAPIView.as_view(), name='room_list_create'),
    path('join/', JoinRoomAPIView.as_view(), name='room_join'),
    path('<str:code_or_id>/', RoomDetailAPIView.as_view(), name='room_detail'),
    path('<str:code_or_id>/sync/', RoomPlaybackSyncAPIView.as_view(), name='room_playback_sync'),
    path('<str:code_or_id>/state/', RoomStateSyncAPIView.as_view(), name='room_state_sync'),
    path('<str:code_or_id>/chat/', RoomChatAPIView.as_view(), name='room_chat'),
    path('<str:code_or_id>/leave/', LeaveRoomAPIView.as_view(), name='room_leave'),
]
