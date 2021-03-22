using System;

namespace ZDragon.Project {
    public class MessageEventArgs : EventArgs {
        public string Message { get; }

        public MessageEventArgs(string message) {
            this.Message = message;
        }
    }
}
