import api from './api'; // Hoặc đường dẫn đến file cấu hình axios của ông

const importService = {
  importAssets: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/assets/import-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export default importService;