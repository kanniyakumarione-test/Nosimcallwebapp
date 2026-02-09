import { useState, useEffect, useRef } from "react";

import Peer from "peerjs";

export default function Call() {
  const [myId, setMyId] = useState("");
  const [remoteId, setRemoteId] = useState("");
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState("");
  const [darkMode] = useState(true);
  const [callType, setCallType] = useState("video"); // "video" or "audio"
  const [dataConn, setDataConn] = useState(null);
  const [username, setUsername] = useState("");
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tempUsername, setTempUsername] = useState("");

  // Moderation state
  const [blockedUsers, setBlockedUsers] = useState(() => {
    const stored = localStorage.getItem("peerBlockedUsers");
    return stored ? JSON.parse(stored) : [];
  });
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");

  // Block user
  const blockUser = (peerId) => {
    if (!peerId) return;
    const updated = [...blockedUsers, peerId];
    setBlockedUsers(updated);
    localStorage.setItem("peerBlockedUsers", JSON.stringify(updated));
    setRemoteId("");
    setCallStatus("User blocked.");
  };

  // Report user (demo: just logs reason)
  const reportUser = (peerId, reason) => {
    if (!peerId || !reason) return;
    // In production, send to backend
    console.log(`Reported ${peerId}: ${reason}`);
    setReportModalOpen(false);
    setReportReason("");
    setCallStatus("User reported.");
  };

  // Prevent calls/messages from blocked users
  useEffect(() => {
    if (incomingCall && blockedUsers.includes(incomingCall.peer)) {
      setCallStatus("Blocked user tried to call.");
      incomingCall.close();
      setIncomingCall(null);
    }
    if (dataConn && blockedUsers.includes(dataConn.peer)) {
      setCallStatus("Blocked user tried to message.");
      dataConn.close();
      setDataConn(null);
    }
  }, [incomingCall, dataConn, blockedUsers]);

    // Call scheduling state
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [scheduledCalls, setScheduledCalls] = useState(() => {
      const stored = localStorage.getItem("peerScheduledCalls");
      return stored ? JSON.parse(stored) : [];
    });
        // Helper to setup data connection for chat and signaling
        function setupDataConnection(conn) {
          setDataConn(conn);
          conn.on("data", async (data) => {
            if (data && data.type === "declined") {
              setCallStatus("Call was declined by remote peer");
              addCallHistory({
                peer: conn.peer,
                type: callType,
                status: "declined",
                time: new Date().toLocaleString(),
              });
            } else if (data && data.type === "end") {
              setCallStatus("Call ended by remote peer");
              if (activeCallRef.current) activeCallRef.current.close();
              activeCallRef.current = null;
              addCallHistory({
                peer: conn.peer,
                type: "incoming",
                status: "ended",
                time: new Date().toLocaleString(),
              });
            } else if (data && data.type === "chat" && data.encMsg && encryptionKey) {
              try {
                const msg = await decryptMessage(data.encMsg, encryptionKey);
                setChatMessages((msgs) => [...msgs, { sender: "remote", text: msg, time: new Date().toLocaleTimeString() }]);
              } catch (e) {
                setChatMessages((msgs) => [...msgs, { sender: "remote", text: "[Decryption failed]", time: new Date().toLocaleTimeString() }]);
              }
            }
          });
        }
    const [schedulePeer, setSchedulePeer] = useState("");
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");

    // Add scheduled call
    const addScheduledCall = () => {
      if (!schedulePeer || !scheduleDate || !scheduleTime) return;
      const call = { peer: schedulePeer, date: scheduleDate, time: scheduleTime };
      const updated = [...scheduledCalls, call];
      setScheduledCalls(updated);
      localStorage.setItem("peerScheduledCalls", JSON.stringify(updated));
      setSchedulePeer("");
      setScheduleDate("");
      setScheduleTime("");
      setScheduleOpen(false);
    };

    // Google Calendar link generator
    const getGoogleCalendarUrl = (call) => {
      const start = new Date(`${call.date}T${call.time}`);
      const end = new Date(start.getTime() + 30 * 60000); // 30 min
      const fmt = (d) => d.toISOString().replace(/-|:|\.[0-9]+/g, "");
      return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=PeerJS%20Call%20with%20${call.peer}&dates=${fmt(start)}/${fmt(end)}&details=Join%20PeerJS%20call%20with%20${call.peer}`;
    };
  // Annotation state
  const [annotateMode, setAnnotateMode] = useState(false);
  const [drawColor, setDrawColor] = useState("#ff0000");
  const canvasRef = useRef(null);
          const conn = peerRef.current.connect(remoteId);
          setupDataConnection(conn);

  // Drawing handlers
  const handleMouseDown = (e) => {
    setDrawing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };
  const handleMouseMove = (e) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.stroke();
  };
  const handleMouseUp = () => {
    setDrawing(false);
  };
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Call recording state
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [downloadUrl, setDownloadUrl] = useState(null);

  // Start recording local stream
  const startRecording = () => {
    if (streamRef.current && !recording) {
      const mediaRecorder = new window.MediaRecorder(streamRef.current);
      let chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        setRecordedChunks(chunks);
        const blob = new Blob(chunks, { type: "video/webm" });
        setDownloadUrl(URL.createObjectURL(blob));
      };
      mediaRecorder.start();
      setRecorder(mediaRecorder);
      setRecording(true);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (recorder && recording) {
      recorder.stop();
      setRecording(false);
    }
  };

  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioDevices, setAudioDevices] = useState([]);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedAudio, setSelectedAudio] = useState("");
  const [selectedVideo, setSelectedVideo] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [callQuality, setCallQuality] = useState({ latency: null, loss: null });
  const [myStatus, setMyStatus] = useState("online");
  const [remoteStatus, setRemoteStatus] = useState("");
  const [callHistory, setCallHistory] = useState(() => {
    const stored = localStorage.getItem("peerCallHistory");
    return stored ? JSON.parse(stored) : [];
  });

  // On mount, check localStorage for username
  useEffect(() => {
    const storedUsername = localStorage.getItem("peerUsername");
    if (storedUsername) {
      setUsername(storedUsername);
      setRegistered(true);
    }
  }, []);

  // Request media permissions on mount to ensure they are granted early
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.warn("Media permissions not granted on mount:", err);
      }
    };
    requestPermissions();
  }, []);

  const myVideo = useRef(null);
  const remoteVideo = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const activeCallRef = useRef(null);

  // End-to-end encryption state
  const [encryptionKey, setEncryptionKey] = useState(null);

  // Generate shared key when call starts (demo: random key, production: use proper key exchange)
  useEffect(() => {
    if (activeCallRef.current && !encryptionKey) {
      const key = window.crypto.getRandomValues(new Uint8Array(16));
      setEncryptionKey(key);
      if (dataConn) {
        dataConn.send({ type: "key", key: Array.from(key) });
      }
    }
  }, [activeCallRef.current, dataConn, encryptionKey]);

  // Receive key from remote
  useEffect(() => {
    if (dataConn) {
      dataConn.on("data", (data) => {
        if (data && data.type === "key" && data.key) {
          setEncryptionKey(new Uint8Array(data.key));
        }
      });
    }
  }, [dataConn]);

  // AES encrypt/decrypt helpers
  async function encryptMessage(msg, key) {
    const enc = new TextEncoder();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const cryptoKey = await window.crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt"]);
    const ciphertext = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, enc.encode(msg));
    return { iv: Array.from(iv), data: Array.from(new Uint8Array(ciphertext)) };
  }
  async function decryptMessage(encMsg, key) {
    const dec = new TextDecoder();
    const cryptoKey = await window.crypto.subtle.importKey("raw", key, "AES-GCM", false, ["decrypt"]);
    const plaintext = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(encMsg.iv) }, cryptoKey, new Uint8Array(encMsg.data));
    return dec.decode(plaintext);
  }

  // Handle incoming chat messages (decrypt)
  useEffect(() => {
    if (dataConn) {
      dataConn.on("data", async (data) => {
        if (data && data.type === "chat" && data.encMsg && encryptionKey) {
          try {
            const msg = await decryptMessage(data.encMsg, encryptionKey);
            setChatMessages((msgs) => [...msgs, { sender: "remote", text: msg, time: new Date().toLocaleTimeString() }]);
          } catch (e) {
            setChatMessages((msgs) => [...msgs, { sender: "remote", text: "[Decryption failed]", time: new Date().toLocaleTimeString() }]);
          }
        }
      });
    }
  }, [dataConn, encryptionKey]);

  // Send chat message (encrypted)
  const sendChatMessage = async () => {
    if (chatInput && dataConn && encryptionKey) {
      const encMsg = await encryptMessage(chatInput, encryptionKey);
      dataConn.send({ type: "chat", encMsg });
      setChatMessages((msgs) => [...msgs, { sender: "me", text: chatInput, time: new Date().toLocaleTimeString() }]);
      setChatInput("");
    }
  };

  // Monitor call quality during active call
  useEffect(() => {
    let interval;
    if (activeCallRef.current) {
      interval = setInterval(() => {
        const pc = activeCallRef.current.peerConnection;
        if (pc && pc.getStats) {
          pc.getStats(null).then(stats => {
            let latency = null;
            let loss = null;
            stats.forEach(report => {
              if (report.type === "remote-inbound-rtp" && report.roundTripTime) {
                latency = Math.round(report.roundTripTime * 1000);
              }
              if (report.type === "remote-inbound-rtp" && report.packetsLost !== undefined && report.packetsReceived !== undefined) {
                loss = Math.round((report.packetsLost / (report.packetsLost + report.packetsReceived)) * 100);
              }
            });
            setCallQuality({ latency, loss });
          });
        }
      }, 2000);
    } else {
      setCallQuality({ latency: null, loss: null });
    }
    return () => interval && clearInterval(interval);
  }, [activeCallRef.current]);

  // Screen sharing handler
  const shareScreen = async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (activeCallRef.current) {
        // Replace video track in current stream
        const sender = activeCallRef.current.peerConnection.getSenders().find(s => s.track && s.track.kind === "video");
        if (sender) {
          sender.replaceTrack(screenStream.getVideoTracks()[0]);
        }
      }
      myVideo.current.srcObject = screenStream;
      // When screen sharing stops, revert to camera
      screenStream.getVideoTracks()[0].addEventListener("ended", async () => {
        const mediaOptions = callType === "video" ? { video: true, audio: true } : { video: false, audio: true };
        const camStream = await navigator.mediaDevices.getUserMedia(mediaOptions);
        if (activeCallRef.current) {
          const sender = activeCallRef.current.peerConnection.getSenders().find(s => s.track && s.track.kind === "video");
          if (sender) {
            sender.replaceTrack(camStream.getVideoTracks()[0]);
          }
        }
        myVideo.current.srcObject = camStream;
      });
    } catch (err) {
      alert("Screen sharing failed: " + err.message);
    }
  };

  // Request notification permission on mount
  useEffect(() => {
    if (window.Notification && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // Check remote peer status
  const checkRemoteStatus = async () => {
    if (!remoteId) {
      setRemoteStatus("");
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL || ""}/presence/online?peerId=${remoteId}`);
      const data = await res.json();
      setRemoteStatus(data.online ? "online" : "offline");
    } catch {
      setRemoteStatus("offline");
    }
  };

  useEffect(() => {
    checkRemoteStatus();
    const interval = setInterval(checkRemoteStatus, 10000); // poll every 10s
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [remoteId, registered]);

  // Send heartbeat to backend to mark self as online
  useEffect(() => {
    if (!myId) return;
    const API_URL = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:5000`;
    const ping = () => {
      fetch(`${API_URL}/presence/ping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerId: myId }),
      }).catch(() => {});
    };
    ping();
    const interval = setInterval(ping, 15000); // Ping every 15s
    return () => clearInterval(interval);
  }, [myId]);

  // Helper to add call event
  const addCallHistory = (event) => {
    setCallHistory(prev => {
      const updated = [...prev, event];
      localStorage.setItem("peerCallHistory", JSON.stringify(updated));
      return updated;
    });
  };

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem("peerUsername");
    setUsername("");
    setRegistered(false);
    setMyId("");
    setCallStatus("");
  };

  useEffect(() => {
    if (!registered) return;
    setLoading(true);
    const API_URL = import.meta.env.VITE_BACKEND_URL || `http://${window.location.hostname}:5000`;
    fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.peerId) {
          setMyId(data.peerId);
          const isSecure = window.location.protocol === 'https:';
          const peer = new Peer(data.peerId, {
            host: import.meta.env.VITE_PEER_HOST || window.location.hostname,
            port: isSecure ? 443 : (Number(import.meta.env.VITE_PEER_PORT) || 5000),
            path: import.meta.env.VITE_PEER_PATH || "/peerjs",
            secure: isSecure,
          });
          peerRef.current = peer;
          peer.on("open", (id) => {
            setMyId(id);
          });
          peer.on("call", (call) => {
            setIncomingCall(call);
            setCallStatus("Incoming call from " + call.peer);
            // Show push notification
            if (window.Notification && Notification.permission === "granted") {
              new Notification("Incoming Call", {
                body: `Peer ${call.peer} is calling you!`,
                icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/peerjs.svg"
              });
            }
          });
          peer.on("connection", (conn) => {
            conn.on("data", (data) => {
              if (data && data.type === "declined") {
                setCallStatus("Call was declined by remote peer");
              }
              if (data && data.type === "end") {
                setCallStatus("Call ended by remote peer");
                if (activeCallRef.current) activeCallRef.current.close();
                activeCallRef.current = null;
                addCallHistory({
                  peer: conn.peer,
                  type: "incoming",
                  status: "ended",
                  time: new Date().toLocaleString(),
                });
              }
            });
            setDataConn(conn);
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [registered, username]);


  const startCall = async () => {
    // 1. Get Media First (Robustness for Mobile)
    const mediaOptions = callType === "video" ? { video: true, audio: true } : { video: false, audio: true };
    let stream = streamRef.current;
    if (!stream || !stream.active) {
        try {
            stream = await navigator.mediaDevices.getUserMedia(mediaOptions);
        } catch (err) {
            if (callType === "video") {
                console.warn("Video permission failed, trying audio-only...");
                stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                setCallType("audio");
            } else {
                throw err;
            }
        }
    }
    streamRef.current = stream;

    setCallStatus("Calling " + remoteId + "...");
    addCallHistory({
      peer: remoteId,
      type: callType,
      status: "outgoing",
      time: new Date().toLocaleString(),
    });
    // Open DataConnection for signaling
    const conn = peerRef.current.connect(remoteId);
    setDataConn(conn);
    conn.on("data", (data) => {
      if (data && data.type === "declined") {
        setCallStatus("Call was declined by remote peer");
        addCallHistory({
          peer: remoteId,
          type: callType,
          status: "declined",
          time: new Date().toLocaleString(),
        });
      }
      if (data && data.type === "end") {
        setCallStatus("Call ended by remote peer");
        if (activeCallRef.current) activeCallRef.current.close();
        activeCallRef.current = null;
        addCallHistory({
          peer: remoteId,
          type: callType,
          status: "ended",
          time: new Date().toLocaleString(),
        });
      }
    });
    // Apply enhancements
    // if (noiseSuppression) stream = await enhanceAudioStream(stream);
    // if (backgroundBlur && callType === "video") stream = await enhanceVideoStream(stream);
    
    if (stream.getVideoTracks().length > 0 && myVideo.current) myVideo.current.srcObject = stream;
    const call = peerRef.current.call(remoteId, stream);
    call.on("stream", (remoteStream) => {
      remoteVideo.current.srcObject = remoteStream;
      setCallStatus("Connected to " + remoteId);
      activeCallRef.current = call;
      addCallHistory({
        peer: remoteId,
        type: callType,
        status: "connected",
        time: new Date().toLocaleString(),
      });
    });
    call.on("close", () => {
      setCallStatus("Call ended");
      addCallHistory({
        peer: remoteId,
        type: callType,
        status: "ended",
        time: new Date().toLocaleString(),
      });
      activeCallRef.current = null;
    });
    call.on("error", () => {
      setCallStatus("Call error");
      addCallHistory({
        peer: remoteId,
        type: callType,
        status: "error",
        time: new Date().toLocaleString(),
      });
      activeCallRef.current = null;
    });
    // Store call for ending
    activeCallRef.current = call;
  };

  const answerCall = async () => {
    try {
      if (!incomingCall) return;
      
      // 1. Get Media Stream Immediately (Fix for Mobile Permissions)
      const mediaOptions = callType === "video" ? { video: true, audio: true } : { video: false, audio: true };
      let stream = streamRef.current;
      
      if (!stream || !stream.active) {
        try {
            stream = await navigator.mediaDevices.getUserMedia(mediaOptions);
        } catch (err) {
            // Fallback to audio only if video fails
            if (callType === "video") {
                console.warn("Video permission denied, falling back to audio", err);
                stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
                setCallType("audio");
            } else {
                throw err;
            }
        }
      }
      streamRef.current = stream;

      setCallStatus("Answering call...");
      addCallHistory({
        peer: incomingCall.peer,
        type: callType,
        status: "incoming",
        time: new Date().toLocaleString(),
      });

      if (stream.getVideoTracks().length > 0 && myVideo.current) myVideo.current.srcObject = stream;
      incomingCall.answer(stream);
      incomingCall.on("stream", (remoteStream) => {
        if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
        setCallStatus("Connected to " + incomingCall.peer);
        activeCallRef.current = incomingCall;
        addCallHistory({
          peer: incomingCall.peer,
          type: callType,
          status: "connected",
          time: new Date().toLocaleString(),
        });
      });
      incomingCall.on("close", () => {
        setCallStatus("Call ended");
        addCallHistory({
          peer: incomingCall.peer,
          type: callType,
          status: "ended",
          time: new Date().toLocaleString(),
        });
        activeCallRef.current = null;
      });
      incomingCall.on("error", () => {
        setCallStatus("Call error");
        addCallHistory({
          peer: incomingCall.peer,
          type: callType,
          status: "error",
          time: new Date().toLocaleString(),
        });
        activeCallRef.current = null;
      });
      setIncomingCall(null);
      // Store call for ending
      activeCallRef.current = incomingCall;
    } catch (err) {
      console.error("Failed to answer call:", err);
      setCallStatus("Error answering call: " + err.message);
      setIncomingCall(null);
    }
  };
  // End call handler
  const endCall = () => {
    if (activeCallRef.current) {
      if (dataConn) {
        try {
          dataConn.send({ type: "end" });
        } catch (e) { console.error(e); }
      }
      activeCallRef.current.close();
      setCallStatus("Call ended by you");
      activeCallRef.current = null;
    }
  };

  const declineCall = () => {
    if (!incomingCall) return;
    setCallStatus("Call declined");
    addCallHistory({
      peer: incomingCall.peer,
      type: callType,
      status: "declined",
      time: new Date().toLocaleString(),
    });
    // Send 'declined' signal to caller
    if (dataConn) {
      try {
        dataConn.send({ type: "declined" });
      } catch (e) {
        console.error("Failed to send decline message", e);
      }
    }
    incomingCall.close();
    setIncomingCall(null);
  };

  const saveSettings = () => {
    if (tempUsername) {
      setUsername(tempUsername);
      localStorage.setItem("peerUsername", tempUsername);
    }
    setSettingsOpen(false);
  };

  if (!registered) {
    // Handler for random call
    const handleRandomCall = async () => {
      try {
        // Request permissions early
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (err) {
        console.warn("Permissions skipped for random call");
      }
      // Generate random Peer ID
      const randomId = "random-" + Math.random().toString(36).substring(2, 10);
      setMyId(randomId);
      // Create Peer instance
      const isSecure = window.location.protocol === 'https:';
      const peer = new Peer(randomId, {
        host: import.meta.env.VITE_PEER_HOST || window.location.hostname,
        port: isSecure ? 443 : (Number(import.meta.env.VITE_PEER_PORT) || 5000),
        path: import.meta.env.VITE_PEER_PATH || "/peerjs",
        secure: isSecure,
      });
      peerRef.current = peer;
      peer.on("open", (id) => {
        setMyId(id);
        setRegistered(true);
        setUsername("");
      });
      peer.on("call", (call) => {
        setIncomingCall(call);
        setCallStatus("Incoming call from " + call.peer);
        if (window.Notification && Notification.permission === "granted") {
          new Notification("Incoming Call", {
            body: `Peer ${call.peer} is calling you!`,
            icon: "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/peerjs.svg"
          });
        }
      });
      peer.on("connection", (conn) => {
        conn.on("data", (data) => {
          if (data && data.type === "declined") {
            setCallStatus("Call was declined by remote peer");
          }
          if (data && data.type === "end") {
            setCallStatus("Call ended by remote peer");
            if (activeCallRef.current) activeCallRef.current.close();
            activeCallRef.current = null;
            addCallHistory({
              peer: conn.peer,
              type: "incoming",
              status: "ended",
              time: new Date().toLocaleString(),
            });
          }
        });
        setDataConn(conn);
      });
      // Optionally: connect to another random online peer (demo: not implemented, needs backend matchmaking)
      // setRemoteId("random-peer-id");
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden p-4">
        {/* Background decoration */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-900/20 blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-[100px]"></div>
        </div>

        <div className="relative z-10 w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Welcome</h2>
            <p className="text-slate-400">Enter a username to get started or try a random call</p>
          </div>
          <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Username</label>
                <input
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                    placeholder="e.g. user123"
                    value={username}
                    onChange={e => {
                      const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
                      setUsername(val);
                    }}
                    disabled={loading}
                />
            </div>
            <button
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              onClick={async () => {
              if (username) {
                try {
                  // Ask for permissions explicitly on user interaction
                  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                  stream.getTracks().forEach(track => track.stop());
                } catch (err) {
                  alert("Please allow camera and microphone permissions to use this app.");
                }
                localStorage.setItem("peerUsername", username);
                setRegistered(true);
              }
              }}
              disabled={!username || loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Registering...</span>
                </>
              ) : "Continue"}
            </button>
            <button
                className="w-full bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold py-3.5 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2 mt-3"
                onClick={handleRandomCall}
            >
                Random Call (No Registration)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30">
      {/* Incoming Call Modal */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in duration-200">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-1">Incoming Call</h3>
                <p className="text-slate-400 text-sm">from <span className="font-mono text-indigo-300">{incomingCall.peer}</span></p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors" onClick={answerCall}>
                Answer
              </button>
              <button className="bg-rose-600 hover:bg-rose-500 text-white font-semibold py-3 px-4 rounded-xl transition-colors" onClick={declineCall}>
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        {/* Presence Status */}
        <div className="flex gap-4 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            <span className="text-xs text-emerald-300">You ({username})</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={
              remoteStatus === "online" ? "w-2 h-2 rounded-full bg-emerald-400 inline-block" : "w-2 h-2 rounded-full bg-rose-400 inline-block"
            }></span>
            <span className={
              remoteStatus === "online" ? "text-xs text-emerald-300" : "text-xs text-rose-300"
            }>Remote ({remoteId || "-"}) {remoteStatus ? `is ${remoteStatus}` : ""}</span>
          </div>
        </div>
        <div className="flex justify-end mb-4 gap-2">
          <button
            className="bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold py-1 px-4 rounded-xl shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 transition text-xs"
            onClick={() => setHistoryOpen(true)}
            title="View call history"
          >
            History
          </button>
          <button
            className="bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold py-1 px-4 rounded-xl shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 transition text-xs"
            onClick={handleLogout}
            title="Logout or change username"
            aria-label="Logout or change username"
          >
            Logout
          </button>
          <button
            className="bg-slate-800 hover:bg-slate-700 text-indigo-300 font-semibold py-1 px-4 rounded-xl shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 transition text-xs"
            onClick={() => setSettingsOpen(true)}
            title="Open settings"
            aria-label="Open settings"
          >
            Settings
          </button>
            <button
              className="bg-slate-800 hover:bg-slate-700 text-green-300 font-semibold py-1 px-4 rounded-xl shadow focus:outline-none focus:ring-2 focus:ring-green-400 transition text-xs"
              onClick={() => setScheduleOpen(true)}
              title="Schedule call"
              aria-label="Schedule call"
            >
              Schedule Call
            </button>
            <button
              className="bg-rose-700 hover:bg-rose-800 text-white font-semibold py-1 px-4 rounded-xl shadow focus:outline-none focus:ring-2 focus:ring-rose-400 transition text-xs"
              onClick={() => blockUser(remoteId)}
              disabled={!remoteId || blockedUsers.includes(remoteId)}
              title="Block user"
              aria-label="Block user"
            >
              Block User
            </button>
            <button
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-1 px-4 rounded-xl shadow focus:outline-none focus:ring-2 focus:ring-yellow-400 transition text-xs"
              onClick={() => setReportModalOpen(true)}
              disabled={!remoteId}
              title="Report user"
              aria-label="Report user"
            >
              Report User
            </button>
              {/* Report User Modal */}
              {reportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 max-w-md w-full" role="dialog" aria-modal="true" tabIndex={-1}>
                    <h2 className="text-xl font-bold text-white mb-4">Report User</h2>
                    <div className="mb-4">
                      <label htmlFor="report-reason" className="block text-sm text-slate-300 mb-1">Reason</label>
                      <input
                        id="report-reason"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        value={reportReason}
                        onChange={e => setReportReason(e.target.value)}
                        aria-label="Report reason"
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <button
                        className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-2 px-6 rounded-xl shadow focus:outline-none focus:ring-2 focus:ring-yellow-400 transition text-xs"
                        onClick={() => reportUser(remoteId, reportReason)}
                        aria-label="Submit report"
                        disabled={!reportReason}
                      >
                        Submit
                      </button>
                      <button
                        className="bg-slate-700 hover:bg-slate-800 text-yellow-300 font-semibold py-2 px-6 rounded-xl shadow focus:outline-none focus:ring-2 focus:ring-yellow-400 transition text-xs"
                        onClick={() => setReportModalOpen(false)}
                        aria-label="Close report modal"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
        </div>
                    {/* Scheduled Calls List */}
                    {scheduledCalls.length > 0 && (
                      <div className="mb-8">
                        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 shadow-lg max-w-md mx-auto">
                          <h3 className="text-lg font-bold text-green-300 mb-2">Scheduled Calls</h3>
                          <ul className="space-y-2">
                            {scheduledCalls.map((call, idx) => (
                              <li key={idx} className="flex items-center gap-3 text-sm py-2 border-b border-slate-800 last:border-b-0">
                                <span className="font-mono text-green-200">{call.peer}</span>
                                <span className="text-slate-300">{call.date} {call.time}</span>
                                <a href={getGoogleCalendarUrl(call)} target="_blank" rel="noopener noreferrer" className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1 rounded-xl text-xs ml-auto">Add to Google Calendar</a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                    {/* Schedule Call Modal */}
                    {scheduleOpen && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 max-w-md w-full" role="dialog" aria-modal="true" tabIndex={-1}>
                          <h2 className="text-xl font-bold text-white mb-4">Schedule a Call</h2>
                          <div className="mb-4">
                            <label htmlFor="peer-schedule" className="block text-sm text-slate-300 mb-1">Peer Username/ID</label>
                            <input
                              id="peer-schedule"
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                              value={schedulePeer}
                              onChange={e => setSchedulePeer(e.target.value)}
                              aria-label="Peer to call"
                            />
                          </div>
                          <div className="mb-4">
                            <label htmlFor="date-schedule" className="block text-sm text-slate-300 mb-1">Date</label>
                            <input
                              id="date-schedule"
                              type="date"
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                              value={scheduleDate}
                              onChange={e => setScheduleDate(e.target.value)}
                              aria-label="Call date"
                            />
                          </div>
                          <div className="mb-4">
                            <label htmlFor="time-schedule" className="block text-sm text-slate-300 mb-1">Time</label>
                            <input
                              id="time-schedule"
                              type="time"
                              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                              value={scheduleTime}
                              onChange={e => setScheduleTime(e.target.value)}
                              aria-label="Call time"
                            />
                          </div>
                          <div className="flex justify-end gap-2 mt-6">
                            <button
                              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-xl shadow focus:outline-none focus:ring-2 focus:ring-green-400 transition text-xs"
                              onClick={addScheduledCall}
                              aria-label="Add scheduled call"
                            >
                              Add
                            </button>
                            <button
                              className="bg-slate-700 hover:bg-slate-800 text-green-300 font-semibold py-2 px-6 rounded-xl shadow focus:outline-none focus:ring-2 focus:ring-green-400 transition text-xs"
                              onClick={() => setScheduleOpen(false)}
                              aria-label="Close schedule modal"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
              {/* Settings Modal */}
              {settingsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 max-w-md w-full" role="dialog" aria-modal="true" tabIndex={-1}>
                    <h2 className="text-xl font-bold text-white mb-4">Settings</h2>
                    <div className="mb-4">
                      <label className="block text-sm text-slate-300 mb-1">Username (Alphanumeric only)</label>
                      <input
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={tempUsername}
                        onChange={e => {
                          const val = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
                          setTempUsername(val);
                        }}
                      />
                    </div>
                    <div className="mb-4">
                      <label htmlFor="audio-select" className="block text-sm text-slate-300 mb-1">Audio Input</label>
                      <select
                        id="audio-select"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={selectedAudio}
                        onChange={e => setSelectedAudio(e.target.value)}
                        aria-label="Select audio input device"
                      >
                        <option value="">Default</option>
                        {audioDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>)}
                      </select>
                    </div>
                    <div className="mb-4">
                      <label htmlFor="video-select" className="block text-sm text-slate-300 mb-1">Video Input</label>
                      <select
                        id="video-select"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={selectedVideo}
                        onChange={e => setSelectedVideo(e.target.value)}
                        aria-label="Select video input device"
                      >
                        <option value="">Default</option>
                        {videoDevices.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || d.deviceId}</option>)}
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <button
                        className="bg-slate-700 hover:bg-slate-800 text-indigo-300 font-semibold py-2 px-6 rounded-xl shadow focus:outline-none focus:ring-2 focus:ring-indigo-400 transition text-xs"
                        onClick={saveSettings}
                        aria-label="Save and close settings"
                      >
                        Save & Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* History Modal */}
              {historyOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                  <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 max-w-md w-full max-h-[80vh] flex flex-col">
                    <h2 className="text-xl font-bold text-white mb-4">Call History</h2>
                    <div className="flex-1 overflow-y-auto pr-2">
                      <ul className="space-y-2">
                        {callHistory.length === 0 && <li className="text-slate-400 text-sm">No calls yet.</li>}
                        {callHistory.slice().reverse().map((item, idx) => (
                          <li key={idx} className="flex items-center gap-3 text-sm py-3 border-b border-slate-800 last:border-b-0">
                            <div className="flex flex-col">
                              <span className="font-mono text-indigo-200 font-bold">{item.peer}</span>
                              <span className="text-xs text-slate-500">{item.time}</span>
                            </div>
                            <span className="text-slate-300 ml-auto text-xs bg-slate-800 px-2 py-1 rounded">{item.type}</span>
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${
                              item.status === "connected" ? "bg-emerald-500/10 text-emerald-400" :
                              item.status === "declined" ? "bg-rose-500/10 text-rose-400" :
                              item.status === "ended" ? "bg-slate-500/10 text-slate-400" :
                              "bg-indigo-500/10 text-indigo-300"
                            }`}>{item.status}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button className="mt-4 w-full bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-xl" onClick={() => setHistoryOpen(false)}>Close</button>
                  </div>
                </div>
              )}
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">NoSimCall <span className="text-indigo-500">.</span></h1>
                <p className="text-slate-400 text-sm">Secure P2P Video & Audio</p>
            </div>
            
            {/* My ID Badge */}
            <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-800 rounded-xl p-2 pr-4">
                <div className="bg-indigo-500/10 p-2 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">My NoSIMID</span>
                    <div className="flex items-center gap-2">
                        <code className="font-mono text-sm text-slate-200">{myId || "Loading..."}</code>
                        <button 
                            onClick={() => { if (myId) { navigator.clipboard.writeText(myId); alert('Copied!'); } }}
                            className="text-slate-500 hover:text-white transition-colors"
                            title="Copy ID"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Controls Panel */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                    <h2 className="text-lg font-semibold text-white mb-4">Make a Call</h2>
                    
                    {/* Call Type Toggle */}
                    <div className="flex bg-slate-950 p-1 rounded-xl mb-6 border border-slate-800">
                        <button
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${callType === "video" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
                            onClick={() => setCallType("video")}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A2 2 0 0122 9.618v4.764a2 2 0 01-2.447 1.894L15 14M15 10v4M15 10l-4.553-2.276A2 2 0 008 9.618v4.764a2 2 0 002.447 1.894L15 14" /></svg>
                            Video
                        </button>
                        <button
                            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${callType === "audio" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
                            onClick={() => setCallType("audio")}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            Audio
                        </button>
                    </div>

                    {/* Remote ID Input */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Recipient ID</label>
                            <input
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all font-mono text-sm"
                                placeholder="Paste NoSIMID here"
                                value={remoteId}
                                onChange={(e) => setRemoteId(e.target.value)}
                            />
                        </div>

                        <button
                            className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2 ${remoteId ? "bg-indigo-600 hover:bg-indigo-500 hover:shadow-indigo-500/25 hover:-translate-y-0.5" : "bg-slate-800 text-slate-500 cursor-not-allowed"}`}
                            onClick={startCall}
                            disabled={!remoteId}
                        >
                            {callType === "audio" ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A2 2 0 0122 9.618v4.764a2 2 0 01-2.447 1.894L15 14M15 10v4M15 10l-4.553-2.276A2 2 0 008 9.618v4.764a2 2 0 002.447 1.894L15 14" /></svg>
                            )}
                            Start Call
                        </button>
                    </div>

                    {/* Status & End Call */}
                    {(callStatus || activeCallRef.current) && (
                        <div className="mt-6 pt-6 border-t border-slate-800 animate-in slide-in-from-top-2">
                            {callStatus && (
                                <div className="flex items-center gap-2 text-sm text-slate-300 mb-4 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                                    <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
                                    </span>
                                    {callStatus}
                                </div>
                            )}
                            
                            {activeCallRef.current && (
                              <div className="flex flex-col gap-2 mt-2">
                                {/* Call Quality Indicator */}
                                <div className="w-full bg-slate-800 text-slate-300 rounded-xl p-2 text-xs flex items-center gap-3 mb-2 border border-slate-700">
                                  <span className="font-semibold">Call Quality:</span>
                                  <span>Latency: {callQuality.latency !== null ? callQuality.latency + " ms" : "-"}</span>
                                  <span>Loss: {callQuality.loss !== null ? callQuality.loss + "%" : "-"}</span>
                                </div>
                                {/* Call Recording Controls */}
                                <div className="w-full bg-slate-800 text-slate-300 rounded-xl p-2 text-xs flex items-center gap-3 mb-2 border border-slate-700">
                                  <span className="font-semibold">Recording:</span>
                                  {!recording && (
                                    <button className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-1 rounded-xl text-xs" onClick={startRecording} aria-label="Start recording">Start</button>
                                  )}
                                  {recording && (
                                    <button className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-1 rounded-xl text-xs" onClick={stopRecording} aria-label="Stop recording">Stop</button>
                                  )}
                                  {downloadUrl && (
                                    <a href={downloadUrl} download="call-recording.webm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-1 rounded-xl text-xs ml-2" aria-label="Download recording">Download</a>
                                  )}
                                </div>
                                <button
                                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-rose-900/20 transition-all flex items-center justify-center gap-2"
                                  onClick={endCall}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.516l2.257-1.13a1 1 0 00.502-1.21L8.28 2.385A1 1 0 007.32 1.715L6 1.715a2 2 0 00-2 2z" /></svg>
                                  End Call
                                </button>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
                                    onClick={shareScreen}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v16h16V4H4zm2 2h12v12H6V6zm3 3v6h6V9H9z" /></svg>
                                    Share
                                  </button>
                                  <button
                                    className="bg-slate-700 hover:bg-slate-800 text-indigo-300 font-bold py-3 rounded-xl shadow-lg shadow-indigo-900/20 transition-all flex items-center justify-center gap-2"
                                    onClick={() => setChatOpen(v => !v)}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V10a2 2 0 012-2h2" /></svg>
                                    Chat
                                  </button>
                                </div>
                                {chatOpen && (
                                  <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 mt-2 flex flex-col max-h-64 overflow-y-auto">
                                    <div className="flex flex-col gap-2 mb-2">
                                      {chatMessages.length === 0 && <div className="text-xs text-slate-400">No messages yet.</div>}
                                      {chatMessages.map((msg, idx) => (
                                        <div key={idx} className={msg.sender === "me" ? "text-right" : "text-left"}>
                                          <span className={msg.sender === "me" ? "bg-indigo-600 text-white px-3 py-1 rounded-xl inline-block text-xs" : "bg-slate-700 text-indigo-200 px-3 py-1 rounded-xl inline-block text-xs"}>
                                            {msg.text}
                                            <span className="ml-2 text-[10px] text-slate-400">{msg.time}</span>
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                      <input
                                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Type a message..."
                                        value={chatInput}
                                        onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter") sendChatMessage(); }}
                                        aria-label="Chat message input"
                                      />
                                      <button
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-1 rounded-xl text-xs"
                                        onClick={sendChatMessage}
                                        disabled={!chatInput}
                                        aria-label="Send chat message"
                                      >
                                        Send
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Video Area */}
            <div className="lg:col-span-2">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6 shadow-xl min-h-[400px] flex flex-col relative">
                    {/* Always render video container (hidden if audio-only) to ensure refs exist and audio plays */}
                    <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 h-full ${callType === "audio" ? "hidden" : ""}`}>
                            {/* Local Video */}
                            <div className="relative bg-black rounded-xl overflow-hidden aspect-video border border-slate-800 shadow-inner group">
                                <video ref={myVideo} autoPlay muted className="w-full h-full object-cover" />
                                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md border border-white/10 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    You
                                </div>
                            </div>
                            
                            {/* Remote Video */}
                            <div className="relative bg-black rounded-xl overflow-hidden aspect-video border border-slate-800 shadow-inner flex items-center justify-center group">
                                <video ref={remoteVideo} autoPlay className="w-full h-full object-cover" />
                                <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md border border-white/10 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                    Remote
                                </div>
                                {/* Placeholder if no stream yet */}
                                {!activeCallRef.current && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A2 2 0 0122 9.618v4.764a2 2 0 01-2.447 1.894L15 14M15 10v4M15 10l-4.553-2.276A2 2 0 008 9.618v4.764a2 2 0 002.447 1.894L15 14" /></svg>
                                        <span className="text-sm">Waiting for connection...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    
                    {callType === "audio" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 rounded-2xl z-10 p-8 text-center">
                            <div className="w-24 h-24 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                            </div>
                            <h3 className="text-xl font-semibold text-white mb-2">Audio Call Active</h3>
                            <p className="text-slate-400 max-w-xs">You are currently in an audio-only call. Video is disabled to save bandwidth.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
    );
}
