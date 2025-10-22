// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/index";
import { Button, TextField, Stack, Typography, Paper, Alert } from "@mui/material";

// 12 haneli öğrenci numarası + @dogus.edu.tr
const emailRegex = /^\d{12}@dogus\.edu\.tr$/;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const isValidEmail = (e) => emailRegex.test(String(e || "").trim().toLowerCase());

  const submit = async () => {
    setErr("");
    const normalizedEmail = email.trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      setErr("E-posta şu formatta olmalı: 202203011029@dogus.edu.tr (12 haneli öğrenci numarası)");
      return;
    }
    if (!password.trim()) {
      setErr("Şifre zorunludur.");
      return;
    }

    try {
      setLoading(true);

      // ÖNEMLİ: baseURL yalnızca host+port, endpoint mutlaka /api ile başlasın
      const { data } = await api.post("/api/Auth/login", {
        email: normalizedEmail,
        password,
      });

      // Backend dönen örnek: { userId, email, fullName, role, token }
      if (!data?.token) {
        setErr("Giriş başarılı görünüyor ama token gelmedi.");
        return;
      }

      // Frontend’in rol/buton kontrolü için 'token' anahtarını kaydediyoruz
      localStorage.setItem("token", data.token);

      // (Opsiyonel) kullanıcı bilgisini saklamak istersen:
      localStorage.setItem(
        "user",
        JSON.stringify({
          userId: data.userId,
          email: data.email,
          fullName: data.fullName,
          role: data.role,
        })
      );

      navigate("/home");
    } catch (e) {
      const msg = e?.response?.data || "Giriş başarısız.";
      setErr(typeof msg === "string" ? msg : "Giriş başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const showFormatError = !!email && !isValidEmail(email);

  return (
    <Paper sx={{ p: 3, maxWidth: 420, mx: "auto", mt: 8 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>UniMeet — Giriş Yap</Typography>
      <Stack spacing={2}>
        {err && <Alert severity="error">{err}</Alert>}

        <TextField
          label="Okul E-Posta (ogrno@dogus.edu.tr)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={showFormatError}
          helperText={
            showFormatError
              ? "E-posta formatı: 12 haneli öğrenci no + @dogus.edu.tr (örn. 202203011029@dogus.edu.tr)"
              : ""
          }
        />

        <TextField
          label="Şifre"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button variant="contained" onClick={submit} disabled={loading}>
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </Button>
      </Stack>
    </Paper>
  );
}
