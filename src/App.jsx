import { useState, useRef, useEffect, useCallback } from "react";

const SUBJECTS = [
  { emoji: "🔢", label: "Matemáticas", color: "#fb923c", light: "#fff7ed", lang: "es", flag: "🇦🇷" },
  { emoji: "📖", label: "Lengua",       color: "#f59e0b", light: "#fffbeb", lang: "es", flag: "🇦🇷" },
  { emoji: "🌿", label: "Ciencias",    color: "#4ade80", light: "#f0fdf4", lang: "es", flag: "🇦🇷" },
  { emoji: "🌍", label: "Sociales",    color: "#60a5fa", light: "#eff6ff", lang: "es", flag: "🇦🇷" },
  { emoji: "🇬🇧", label: "English",    color: "#818cf8", light: "#eef2ff", lang: "en", flag: "🇬🇧" },
  { emoji: "🇫🇷", label: "Français",   color: "#f472b6", light: "#fdf2f8", lang: "fr", flag: "🇫🇷" },
];

const QUICK_QUESTIONS = {
  "Matemáticas": ["¿Cómo se multiplica? 🍕", "¿Qué es una fracción? 🍰", "¿Cómo se divide? 🍫"],
  "Lengua":      ["¿Qué es un sustantivo? 🐶", "¿Para qué sirven las tildes? 🎵", "¿Qué es un adjetivo? 🌈"],
  "Ciencias":   ["¿Por qué hay día y noche? 🌙", "¿Cómo respiran las plantas? 🌱", "¿Cadena alimentaria? 🦁"],
  "Sociales":   ["¿Qué es un continente? 🗺️", "¿Qué es la democracia? 🗳️", "¿Mayo de 1810? ⭐"],
  "English":    ["What is a noun? 🐱", "Colors in English? 🎨", "What is past tense? ⏰"],
  "Français":   ["Comment dire bonjour? 👋", "Qu'est-ce qu'un verbe? ✏️", "Les couleurs? 🎨"],
};

function buildSystemPrompt(s) {
  const isEn = s.lang === "en", isFr = s.lang === "fr";
  const li = isEn
    ? "You MUST respond ONLY in English. Teach English to a Spanish-speaking child."
    : isFr
    ? "Tu dois répondre UNIQUEMENT en français. Enseigne le français à une enfant hispanophone."
    : "Responde SIEMPRE en español.";
  const sc = isEn
    ? "Teaching: English (vocabulary, grammar) for 4th grade bilingual school."
    : isFr
    ? "Tu enseignes: français (vocabulaire, grammaire) niveau CM1, école bilingue."
    : `Estás enseñando: ${s.label} para 4to grado de primaria en Argentina.`;
  return `Eres "Profe Sol" ${s.flag}, maestra cariñosa experta en enseñar a niñas con dislexia.
Tu alumna es Cata, 9 años, 4to grado colegio bilingüe español-inglés, también estudia francés.
${li}
${sc}
Si te mandan una imagen de un examen o ejercicio, analizála y explicá cada punto UNO POR UNO de forma muy simple con emojis y ejemplos concretos.
REGLAS: oraciones MUY cortas (máx 2 líneas/párrafo), muchos emojis, UN concepto a la vez, listas simples, elogios frecuentes ("¡Muy bien Cata!"), analogías cotidianas, respuestas máx 8 líneas, termina SIEMPRE con una pregunta simple, SIN asteriscos ni markdown, llamá a la niña "Cata" de vez en cuando.
IMPORTANTE PARA VOZ: tus respuestas deben sonar bien al escucharlas. Usá oraciones completas que suenen naturales al hablar.
Si algo es difícil: "No pasa nada, lo intentamos juntas".
Cata aprende diferente, no menos. Sé su mejor aliada.`;
}

function initMsg(s) {
  return s.lang === "en"
    ? "Hi Cata! I'm Profe Sol. I'm here to help you learn English! What do you want to learn today?"
    : s.lang === "fr"
    ? "Bonjour Cata! Je suis la Profe Sol. Je suis là pour t'aider à apprendre le français! Qu'est-ce que tu veux apprendre?"
    : `¡Hola Cata! Soy la Profe Sol. Estoy aquí para ayudarte con ${s.label}. Podés escribirme, hablarme o subir una foto de tu tarea. ¿Qué querés aprender hoy? 😊`;
}

function TypingDots({ color }) {
  return (
    <div style={{ display: "flex", gap: 5, padding: "10px 14px" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 9, height: 9, borderRadius: "50%", background: color,
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

export default function ProfeSol() {
  const [curSub, setCurSub] = useState(0);
  const [chats, setChats] = useState(() => {
    const init = {};
    SUBJECTS.forEach((s, i) => { init[i] = [{ role: "assistant", content: initMsg(s) }]; });
    return init;
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);
  const recognitionRef = useRef(null);

  const s = SUBJECTS[curSub];
  const messages = chats[curSub] || [];
  const quickQs = QUICK_QUESTIONS[s.label] || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, loading, curSub]);

  const speak = useCallback((text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const lang = s.lang === "en" ? "en-US" : s.lang === "fr" ? "fr-FR" : "es-AR";
    const clean = text.replace(/[\u{1F300}-\u{1FFFF}]/gu, "").replace(/\n/g, " ").trim();
    const utt = new SpeechSynthesisUtterance(clean);
    utt.lang = lang; utt.rate = 0.92; utt.pitch = 1.1;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang.startsWith(lang.split("-")[0]) && /female|mujer/i.test(v.name))
      || voices.find(v => v.lang.startsWith(lang.split("-")[0]));
    if (v) utt.voice = v;
    window.speechSynthesis.speak(utt);
  }, [voiceEnabled, s]);

  function toggleMic() {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Usá Chrome para el micrófono 🎤"); return; }
    const lang = s.lang === "en" ? "en-US" : s.lang === "fr" ? "fr-FR" : "es-AR";
    const r = new SR();
    r.lang = lang; r.continuous = false; r.interimResults = false;
    r.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setIsRecording(false);
      sendMessage(t, null);
    };
    r.onerror = () => setIsRecording(false);
    r.onend = () => setIsRecording(false);
    r.start();
    recognitionRef.current = r;
    setIsRecording(true);
  }

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setPendingImage({ base64: dataUrl.split(",")[1], mediaType: file.type || "image/jpeg", previewUrl: dataUrl, name: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  async function sendMessage(text, img) {
    const userText = text || input.trim();
    if (loading || (!userText && !img && !pendingImage)) return;
    const imageToSend = img !== undefined ? img : pendingImage;
    setInput("");
    setPendingImage(null);
    setLoading(true);
    window.speechSynthesis?.cancel();

    const newChats = { ...chats };
    if (imageToSend) newChats[curSub] = [...newChats[curSub], { role: "image-preview", url: imageToSend.previewUrl, name: imageToSend.name }];
    if (userText) newChats[curSub] = [...newChats[curSub], { role: "user", content: userText }];
    setChats(newChats);

    const history = newChats[curSub].filter(m => m.role !== "image-preview");
    const apiMsgs = history.map(m => ({ role: m.role, content: m.content }));

    if (imageToSend) {
      const lastU = apiMsgs.map(m => m.role).lastIndexOf("user");
      const textPart = userText ? [{ type: "text", text: userText }] : [];
      const promptPart = userText ? [] : [{ type: "text", text: "Mirá este examen o tarea. Explicale a Cata cada ejercicio uno por uno, de forma muy simple. Preguntale por cuál quiere empezar." }];
      const content = [{ type: "image", source: { type: "base64", media_type: imageToSend.mediaType, data: imageToSend.base64 } }, ...textPart, ...promptPart];
      if (lastU >= 0) apiMsgs[lastU] = { role: "user", content };
      else apiMsgs.push({ role: "user", content });
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMsgs, system: buildSystemPrompt(s) }),
      });
      const data = await res.json();
      const reply = data.reply || "No entendí bien. ¿Me lo preguntas de nuevo? 💛";
      setChats(prev => ({ ...prev, [curSub]: [...prev[curSub], { role: "assistant", content: reply }] }));
      speak(reply);
    } catch {
      setChats(prev => ({ ...prev, [curSub]: [...prev[curSub], { role: "assistant", content: "Ups, algo falló 😅 ¿Lo intentamos de nuevo?" }] }));
    } finally {
      setLoading(false);
    }
  }

  function switchSub(i) {
    window.speechSynthesis?.cancel();
    setCurSub(i);
    setTimeout(() => speak(initMsg(SUBJECTS[i])), 300);
  }

  const ac = s.color;
  const ph = isRecording ? "🎤 Escuchando..." : s.lang === "en" ? "Type or tap 🎤 to speak" : s.lang === "fr" ? "Écris ou parle 🎤" : "Escribí o tocá 🎤 para hablar";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: s.light, fontFamily: "'Nunito', sans-serif", maxWidth: 640, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes bounce { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        @keyframes popIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.15)} }
        ::-webkit-scrollbar{width:5px} ::-webkit-scrollbar-thumb{background:${ac};border-radius:10px}
        textarea:focus{outline:none} button{cursor:pointer;transition:all .15s;font-family:'Nunito',sans-serif}
        button:hover{opacity:.85} button:active{transform:scale(.96)}
      `}</style>

      {/* Header */}
      <div style={{ background: ac, padding: "12px 15px", display: "flex", alignItems: "center", gap: 11, flexShrink: 0, boxShadow: `0 3px 12px ${ac}55` }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>☀️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,.2)" }}>Profe Sol {s.flag}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,.9)", fontWeight: 700 }}>Tu maestra de 4to grado 💛</div>
        </div>
        <button onClick={() => { setVoiceEnabled(v => !v); window.speechSynthesis?.cancel(); }}
          style={{ background: `rgba(255,255,255,${voiceEnabled ? ".25" : ".1"})`, border: "none", borderRadius: 10, padding: "5px 9px", fontSize: 18, color: "#fff" }}>
          {voiceEnabled ? "🔊" : "🔇"}
        </button>
        <div style={{ fontSize: 22 }}>{s.emoji}</div>
      </div>

      {/* Subject tabs */}
      <div style={{ display: "flex", gap: 5, padding: "7px 10px", overflowX: "auto", background: "rgba(255,255,255,.8)", borderBottom: "1px solid rgba(0,0,0,.06)", flexShrink: 0 }}>
        {SUBJECTS.map((sub, i) => (
          <button key={i} onClick={() => switchSub(i)} style={{
            padding: "6px 12px", borderRadius: 20, fontSize: 11.5, whiteSpace: "nowrap",
            fontWeight: curSub === i ? 900 : 700, border: `2px solid ${curSub === i ? sub.color : "#e5e7eb"}`,
            background: curSub === i ? sub.color : "#fff", color: curSub === i ? "#fff" : "#555",
            boxShadow: curSub === i ? `0 2px 8px ${sub.color}55` : "none",
          }}>{sub.emoji} {sub.label}</button>
        ))}
      </div>

      {/* Chat */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 9 }}>
        {messages.map((m, i) => {
          if (m.role === "image-preview") return (
            <div key={i} style={{ alignSelf: "flex-end", maxWidth: 180, borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,.12)" }}>
              <img src={m.url} style={{ width: "100%", display: "block" }} alt="examen" />
              <div style={{ background: ac, color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px" }}>📸 {m.name}</div>
            </div>
          );
          const isLast = i === messages.length - 1;
          return (
            <div key={i} style={{
              maxWidth: "83%", padding: "10px 14px", fontSize: 15, lineHeight: 1.75, fontWeight: 600,
              wordBreak: "break-word", alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role === "user" ? ac : "#fff", color: m.role === "user" ? "#fff" : "#2d2d2d",
              borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              boxShadow: m.role === "user" ? `0 2px 10px ${ac}55` : "0 2px 6px rgba(0,0,0,.07)",
              animation: isLast ? "popIn .3s ease" : "none",
            }}>
              {m.content.split("\n").map((line, j, arr) => <span key={j}>{line}{j < arr.length - 1 && <br />}</span>)}
              {m.role === "assistant" && voiceEnabled && (
                <div style={{ marginTop: 6 }}>
                  <button onClick={() => speak(m.content)} style={{
                    background: "rgba(0,0,0,.07)", border: "none", borderRadius: 8, padding: "3px 8px",
                    fontSize: 11, fontWeight: 700, color: "#555",
                  }}>🔊 Escuchar</button>
                </div>
              )}
            </div>
          );
        })}
        {loading && (
          <div style={{ alignSelf: "flex-start", background: "#fff", borderRadius: "18px 18px 18px 4px", boxShadow: "0 2px 6px rgba(0,0,0,.07)" }}>
            <TypingDots color={ac} />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      <div style={{ padding: "6px 10px 5px", background: "rgba(255,255,255,.85)", borderTop: "1px solid rgba(0,0,0,.05)", flexShrink: 0 }}>
        <div style={{ fontSize: 10, color: "#999", fontWeight: 800, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".5px" }}>💡 Pregunta rápida</div>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
          {quickQs.map(q => (
            <button key={q} onClick={() => sendMessage(q, null)} style={{
              padding: "4px 9px", borderRadius: 14, fontSize: 11, fontWeight: 700,
              border: `1.5px solid ${ac}`, background: "#fff", color: "#444",
            }}>{q}</button>
          ))}
        </div>
      </div>

      {/* Image preview bar */}
      {pendingImage && (
        <div style={{ padding: "5px 10px", background: "#fffde7", borderTop: "1px solid #fdd835", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <img src={pendingImage.previewUrl} style={{ width: 36, height: 36, objectFit: "cover", borderRadius: 7, border: `2px solid ${ac}` }} alt="" />
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#555", flex: 1 }}>📎 {pendingImage.name}</span>
          <button onClick={() => setPendingImage(null)} style={{ background: "none", border: "none", fontSize: 15, color: "#aaa" }}>✕</button>
        </div>
      )}

      {/* Input bar */}
      <div style={{ display: "flex", gap: 6, padding: "8px 10px", background: "rgba(255,255,255,.95)", borderTop: `2px solid ${ac}44`, alignItems: "flex-end", flexShrink: 0 }}>
        <input type="file" ref={fileRef} accept="image/*,.pdf" style={{ display: "none" }} onChange={handleFile} />
        <button onClick={() => fileRef.current?.click()} style={{
          width: 40, height: 44, borderRadius: 12, border: `2px solid ${ac}`, color: ac,
          background: "transparent", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
        }}>📸</button>
        <textarea value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(null, null); } }}
          placeholder={ph} rows={2}
          style={{ flex: 1, border: `2px solid ${isRecording ? ac : ac + "88"}`, background: isRecording ? s.light : "#fff", color: "#333", borderRadius: 14, padding: "10px 13px", fontSize: 15, fontWeight: 600, lineHeight: 1.5 }}
        />
        <button onClick={toggleMic} style={{
          width: 44, height: 44, borderRadius: "50%", border: "none", fontSize: 20,
          background: isRecording ? ac : "#f0f0f0", color: isRecording ? "#fff" : "#555",
          boxShadow: isRecording ? `0 0 0 4px ${ac}44` : "none",
          animation: isRecording ? "pulse .8s ease-in-out infinite" : "none",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>🎤</button>
        <button onClick={() => sendMessage(null, null)} disabled={loading || (!input.trim() && !pendingImage)} style={{
          width: 44, height: 44, borderRadius: "50%", border: "none", fontSize: 19,
          background: ac, color: "#fff", boxShadow: `0 3px 10px ${ac}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: loading || (!input.trim() && !pendingImage) ? 0.35 : 1,
        }}>✉️</button>
      </div>
    </div>
  );
}
