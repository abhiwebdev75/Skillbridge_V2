import api from './api';

export const uploadAvatar = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file); // 'file' must match upload.single('file') in backend

  const { data } = await api.post('/upload/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (p) => onProgress(Math.round((p.loaded * 100) / p.total)),
  });
  return data.url;
};

export const uploadResume = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await api.post('/upload/resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (p) => onProgress(Math.round((p.loaded * 100) / p.total)),
  });
  return data.url;
};