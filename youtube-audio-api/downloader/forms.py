import re
from django import forms
from .models import YouTubeChannel


def clean_channel_id_value(val):
    if not val:
        return val
    val = val.strip()
    # Normalize if user pasted full YouTube channel URL or @handle
    m = re.search(r'youtube\.com/(?:channel/|@)([A-Za-z0-9_.-]+)', val)
    if m:
        if '/@' in val:
            return f"@{m.group(1)}"
        return m.group(1)
    return val.strip('/')


class YouTubeChannelForm(forms.ModelForm):
    class Meta:
        model = YouTubeChannel
        fields = ['name', 'channel_id']
        widgets = {
            'name': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Channel Name'}),
            'channel_id': forms.TextInput(attrs={'class': 'form-control', 'placeholder': 'Channel ID (UC...) or @handle or URL'}),
        }

    def clean_channel_id(self):
        cid = self.cleaned_data.get('channel_id', '')
        return clean_channel_id_value(cid)