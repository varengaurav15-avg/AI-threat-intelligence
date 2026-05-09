import axios from 'axios'
import { io } from 'socket.io-client'

const BASE = 'http://localhost:8000'
export const socket = io(BASE, { transports: ['websocket'] })

export const api = {
  getThreats:   (p)  => axios.get(`${BASE}/api/threats`, { params: p }),
  getStats:     ()   => axios.get(`${BASE}/api/threats/stats`),
  getIncidents: ()   => axios.get(`${BASE}/api/incidents`),
  getBrief:     ()   => axios.get(`${BASE}/api/brief/today`),
  getConfig:    ()   => axios.get(`${BASE}/api/config/permissions`),
  saveConfig:   (d)  => axios.post(`${BASE}/api/config/permissions`, d),
  resolveThreat: (id) => axios.patch(`${BASE}/api/threats/${id}/resolve`),
}