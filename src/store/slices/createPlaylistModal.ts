import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CreatePlaylistModalState {
  isOpen: boolean;
  initialName?: string;
  initialTrackUri?: string;
  isPublic?: boolean;
}

const initialState: CreatePlaylistModalState = {
  isOpen: false,
  initialName: '',
  initialTrackUri: undefined,
  isPublic: true,
};

const createPlaylistModalSlice = createSlice({
  name: 'createPlaylistModal',
  initialState,
  reducers: {
    openCreatePlaylistModal(
      state,
      action: PayloadAction<{ initialName?: string; initialTrackUri?: string; isPublic?: boolean } | undefined>
    ) {
      state.isOpen = true;
      state.initialName = action.payload?.initialName || '';
      state.initialTrackUri = action.payload?.initialTrackUri;
      state.isPublic = action.payload?.isPublic !== undefined ? action.payload.isPublic : true;
    },
    closeCreatePlaylistModal(state) {
      state.isOpen = false;
      state.initialName = '';
      state.initialTrackUri = undefined;
      state.isPublic = true;
    },
  },
});

export const createPlaylistModalActions = createPlaylistModalSlice.actions;

export default createPlaylistModalSlice.reducer;
