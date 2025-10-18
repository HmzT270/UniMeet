import { useState } from "react";
import { api } from "../api";
import { Button, TextField, Stack, Typography, Paper, Alert } from "@mui/material";

// E-posta kontrolü: 11 haneli numara + @dogus.edu.tr
const emailRegex = /^\d{12}@dogus\.edu\.tr$/;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const isValidEmail = (e) => emailRegex.test((e || "").trim());

  const submit = async () => {
    setErr("");

    if (!isValidEmail(email)) {
      setErr("E-posta şu formatta olmalı: 111111111111@dogus.edu.tr (12 haneli öğrenci numarası)");
      return;
    }
    if (!password.trim()) {
      setErr("Şifre zorunludur.");
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("user", JSON.stringify(data));
      window.location.href = "/clubs";
    } catch (e) {
      setErr(e?.response?.data || "Giriş başarısız.");
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
              ? "E-posta formatı: 11 haneli öğrenci no + @dogus.edu.tr"
              : ""
          }
        />

        <TextField
          label="Şifre"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button
          variant="contained"
          onClick={submit}
          disabled={loading}
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </Button>
      </Stack>
    </Paper>
  );
}
