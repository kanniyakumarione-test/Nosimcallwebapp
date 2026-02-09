import { PeerServer } from "peer";

export const peerServer = PeerServer({
  port: 9000,
  path: "/peer",
  allow_discovery: true,
});
