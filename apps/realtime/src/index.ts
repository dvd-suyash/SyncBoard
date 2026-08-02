import { Server } from 'socket.io';
import http from 'http';

const port = process.env.PORT || 3001;

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: process.env.WEB_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  socket.on('join-board', (boardId) => {
    socket.join(boardId);
    console.log(`Socket ${socket.id} joined board ${boardId}`);
  });

  socket.on('element-update', ({ boardId, elements }) => {
    socket.to(boardId).emit('element-update', elements);
  });

  socket.on('cursor-move', ({ boardId, cursor }) => {
    socket.to(boardId).emit('cursor-move', { userId: socket.id, cursor });
  });

  // WebRTC Signaling
  socket.on('stream-started', ({ boardId }) => {
    socket.to(boardId).emit('stream-started', { userId: socket.id });
  });

  socket.on('stream-stopped', ({ boardId }) => {
    socket.to(boardId).emit('stream-stopped', { userId: socket.id });
  });

  socket.on('webrtc-signal', ({ to, signal }) => {
    io.to(to).emit('webrtc-signal', { from: socket.id, signal });
  });

  socket.on('request-stream-status', ({ boardId }) => {
    socket.to(boardId).emit('request-stream-status', { from: socket.id });
  });

  socket.on('direct-stream-started', ({ to }) => {
    io.to(to).emit('stream-started', { userId: socket.id });
  });

  // Media Syncing
  socket.on('media-sync', ({ boardId, elementId, state, time }) => {
    socket.to(boardId).emit('media-sync', { elementId, state, time, userId: socket.id });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(port, () => {
  console.log(`Realtime server listening on port ${port}`);
});
