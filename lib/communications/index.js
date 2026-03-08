/**
 * Communications Module - Frontend API
 */

export {
  // User tickets
  fetchTickets,
  fetchTicketNotifications,
  createTicket,
  fetchTicket,
  addTicketMessage,
  closeTicket,
  // Admin tickets
  fetchAllTickets,
  fetchAdminTicket,
  addAdminMessage,
  updateTicket,
} from './api';
