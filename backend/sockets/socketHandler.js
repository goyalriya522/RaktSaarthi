let ioInstance = null;

const initSockets = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log(`Socket client connected: ${socket.id}`);

    // Join user specific room
    socket.on('join_user', (data) => {
      if (data && data.userId) {
        socket.join(`user_${data.userId}`);
        if (data.role) {
          socket.join(`role_${data.role}`);
        }
        console.log(`Socket ${socket.id} joined user_${data.userId} & role_${data.role}`);
      }
    });

    // Join specific blood request room
    socket.on('join_request', (requestId) => {
      if (requestId) {
        socket.join(`request_${requestId}`);
        console.log(`Socket ${socket.id} joined request_${requestId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket client disconnected: ${socket.id}`);
    });
  });
};

const getIO = () => ioInstance;

const emitToUser = (userId, event, payload) => {
  if (ioInstance) {
    ioInstance.to(`user_${userId}`).emit(event, payload);
  }
};

const emitToRole = (role, event, payload) => {
  if (ioInstance) {
    ioInstance.to(`role_${role}`).emit(event, payload);
  }
};

const emitRequestUpdate = (requestId, event, payload) => {
  if (ioInstance) {
    ioInstance.to(`request_${requestId}`).emit(event, payload);
    // Also send to hospitals & blood banks
    ioInstance.to('role_hospital').emit(event, payload);
    ioInstance.to('role_bloodbank').emit(event, payload);
    ioInstance.to('role_admin').emit(event, payload);
  }
};

const broadcastGlobal = (event, payload) => {
  if (ioInstance) {
    ioInstance.emit(event, payload);
  }
};

module.exports = {
  initSockets,
  getIO,
  emitToUser,
  emitToRole,
  emitRequestUpdate,
  broadcastGlobal
};
