from django.urls import path
from .views import (
    UserSearchView,
    FriendListView,
    FriendRequestListCreateView,
    FriendRequestActionView,
    DirectMessageConversationView,
    ConversationListView,
)

urlpatterns = [
    path('users/search/', UserSearchView.as_view(), name='social-user-search'),
    path('friends/', FriendListView.as_view(), name='social-friends'),
    path('requests/', FriendRequestListCreateView.as_view(), name='social-requests'),
    path('requests/<int:pk>/', FriendRequestActionView.as_view(), name='social-request-action'),
    path('conversations/', ConversationListView.as_view(), name='social-conversations'),
    path('messages/<int:user_id>/', DirectMessageConversationView.as_view(), name='social-messages'),
]
