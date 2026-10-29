import { fetch } from 'expo/fetch';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';
import { createUploadId } from './upload-id';

export type UploadProgress = {
  attempt: number;
  percent: number;
  message: string;
};

export async function choosePropertyPhoto(source: 'camera' | 'library') {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted)
      throw new Error(
        'Camera permission is required to take a property photo.',
      );
  }
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.82,
          allowsEditing: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.82,
          allowsEditing: true,
        });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset || (asset.fileSize && asset.fileSize > 5 * 1024 * 1024)) {
    throw new Error('Choose a JPEG, PNG or WebP photo up to 5 MB.');
  }
  return asset;
}

export async function uploadPropertyPhoto(
  userId: string,
  asset: ImagePicker.ImagePickerAsset,
  onProgress: (progress: UploadProgress) => void,
) {
  const type = asset.mimeType || 'image/jpeg';
  const extension =
    type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type))
    throw new Error('Use a JPEG, PNG or WebP photo.');
  const path = `${userId}/${createUploadId()}.${extension}`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      onProgress({ attempt, percent: 10, message: 'Preparing photo…' });
      const response = await fetch(asset.uri);
      const body = await response.arrayBuffer();
      onProgress({ attempt, percent: 55, message: 'Uploading securely…' });
      const { error } = await supabase.storage
        .from('property-photos')
        .upload(path, body, {
          contentType: type,
          upsert: false,
        });
      if (error) throw error;
      const { data } = supabase.storage
        .from('property-photos')
        .getPublicUrl(path);
      onProgress({ attempt, percent: 100, message: 'Photo ready' });
      return { storage_path: path, url: data.publicUrl, alt_text: '' };
    } catch (error) {
      lastError = error;
      onProgress({
        attempt,
        percent: 0,
        message: attempt < 3 ? 'Retrying upload…' : 'Upload failed',
      });
    }
  }
  throw lastError || new Error('Photo upload failed.');
}
