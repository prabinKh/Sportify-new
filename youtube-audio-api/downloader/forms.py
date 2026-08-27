from django import forms
from .models import YouTubeChannel

class YouTubeChannelForm(forms.ModelForm):
    class Meta:
        model = YouTubeChannel
        fields = ['name', 'channel_id']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Channel Name'}),
            'channel_id': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'UCxxxxxxxxxx'}),
        }