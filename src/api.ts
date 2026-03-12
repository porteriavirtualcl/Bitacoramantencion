import { useState, useEffect } from 'react';

const API_BASE = '/api';

export const api = {
  async request(endpoint: string, options: any = {}) {
    console.log(`API Request: ${options.method || 'GET'} ${endpoint}`, options.body);
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
      console.log(`API Response: ${response.status} ${endpoint}`);
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          console.error('API Error JSON:', error);
          throw new Error(error.error || 'Something went wrong');
        } else {
          const text = await response.text();
          console.error('API Error Text:', text.substring(0, 100));
          throw new Error(`Server error: ${response.status}`);
        }
      }
      const data = await response.json();
      console.log(`API Data:`, data);
      return data;
    } catch (err) {
      console.error('API Fetch Exception:', err);
      throw err;
    }
  },

  login(credentials: any) {
    return this.request('/login', { method: 'POST', body: JSON.stringify(credentials) });
  },

  getCondos() {
    return this.request('/condos');
  },

  getEquipment() {
    return this.request('/equipment');
  },

  getCondoEquipment(condoId: number) {
    return this.request(`/condos/${condoId}/equipment`);
  },

  startLog(condoId: number, logType: string = 'mantenimiento') {
    return this.request('/logs/start', { method: 'POST', body: JSON.stringify({ condoId, logType }) });
  },

  finishLog(logId: number, data: { details?: any[], problemDescription?: string, actionsTaken?: string }) {
    return this.request(`/logs/${logId}/finish`, { method: 'POST', body: JSON.stringify(data) });
  },

  getHistory() {
    return this.request('/logs/history');
  },

  getLog(id: number) {
    return this.request(`/logs/${id}`);
  },

  cancelLog(id: number) {
    return this.request(`/logs/${id}`, { method: 'DELETE' });
  },

  pauseLog(id: number) {
    return this.request(`/logs/${id}/pause`, { method: 'PUT' });
  },

  getLogPdfUrl(logId: number) {
    return `/api/logs/${logId}/pdf?token=${localStorage.getItem('token')}`;
  },

  createCondo(data: any) {
    return this.request('/condos', { method: 'POST', body: JSON.stringify(data) });
  },

  updateCondo(id: number, data: any) {
    return this.request(`/condos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  createEquipment(name: string) {
    return this.request('/equipment', { method: 'POST', body: JSON.stringify({ name }) });
  },

  deleteEquipment(id: number) {
    return this.request(`/equipment/${id}`, { method: 'DELETE' });
  },

  getTechs() {
    return this.request('/users/techs');
  },

  createUser(data: any) {
    return this.request('/users', { method: 'POST', body: JSON.stringify(data) });
  },

  updateUser(id: number, data: any) {
    return this.request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  },

  getTechCondos(userId: number) {
    return this.request(`/users/${userId}/condos`);
  },

  assignCondosToTech(userId: number, condoIds: number[]) {
    return this.request(`/users/${userId}/condos`, { method: 'POST', body: JSON.stringify({ condoIds }) });
  },

  changePassword(data: { currentPassword?: string, newPassword: string }) {
    return this.request('/users/change-password', { method: 'POST', body: JSON.stringify(data) });
  },
  
  getVapidPublicKey() {
    return this.request('/notifications/vapid-public-key');
  },

  subscribeToNotifications(subscription: any) {
    return this.request('/notifications/subscribe', { method: 'POST', body: JSON.stringify({ subscription }) });
  },

  getIncidents() {
    return this.request('/incidents');
  },

  reportIncident(data: { condoId: number, equipmentId: number, description: string }) {
    return this.request('/incidents', { method: 'POST', body: JSON.stringify(data) });
  },

  updateIncidentStatus(id: number, status: string) {
    return this.request(`/incidents/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
  },

  getIncidentPdfUrl(id: number) {
    const token = localStorage.getItem('token');
    return `/api/incidents/${id}/pdf?token=${token}`;
  }
};
