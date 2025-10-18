import { useState } from "react";
import {
  AppBar, Toolbar, Typography, Container, Paper, Stack,
  TextField, Button, Snackbar, Alert, Box, FormControl,
  InputLabel, Select, MenuItem
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { api } from "../api";

export default function ManageEvents() {
  const navigate = useNavigate();

  // Form state
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [dateTime, setDateTime] = useState(""); // HTML datetime-local value
  const [capacity, setCapacity] = useState("");
  const [clubId, setClubId] = useState(""); // şimdilik string; backend hazır olunca number'a çevirirsin
  const [description, setDescription] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [okOpen, setOkOpen] = useState(false);

  // Basit doğrulama
  const validate = () => {
    if (!name.trim()) return "Etkinlik adı zorunludur.";
    if (!location.trim()) return "Etkinlik yeri zorunludur.";
    if (!dateTime) return "Etkinlik zamanı zorunludur.";
    if (!capacity || isNaN(Number(capacity)) || Number(capacity) <= 0)
      return "Kontenjan pozitif bir sayı olmalıdır.";
    if (!clubId) return "Lütfen bir kulüp seçin.";
    if (!description.trim()) return "Açıklama zorunludur.";
    return "";
  };

  const handleSubmit = async () => {
    setError("");
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);
    try {
      // Backend'e gidecek payload (ISO tarih)
      const payload = {
        name: name.trim(),
        location: location.trim(),
        startsAt: new Date(dateTime).toISOString(),
        capacity: Number(capacity),
        clubId, // backend'e göre number gerekirse: parseInt(clubId, 10)
        description: description.trim(),
      };

      // ÖRNEK endpoint: /api/events
      await api.post("/events", payload);

      setOkOpen(true);
      // Formu temizle
      setName("");
      setLocation("");
      setDateTime("");
      setCapacity("");
      setClubId("");
      setDescription("");
    } catch (e) {
      const msg = e?.response?.data || "Etkinlik oluşturulamadı.";
      setError(typeof msg === "string" ? msg : "Etkinlik oluşturulamadı.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>UniMeet — Etkinlik Oluştur</Typography>
          <Button onClick={() => navigate("/home")}>Ana Sayfa</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 6 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Etkinlik Bilgileri</Typography>

          <Stack spacing={2}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Etkinlik Adı"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <TextField
              label="Yer"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />

            <TextField
              label="Zaman"
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              InputLabelProps={{ shrink: true }}
              required
            />

            <TextField
              label="Kontenjan"
              type="number"
              inputProps={{ min: 1 }}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
            />

            <FormControl fullWidth required>
              <InputLabel id="club-label">Kulüp</InputLabel>
              <Select
                labelId="club-label"
                label="Kulüp"
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
              >
              </Select>
            </FormControl>

            <TextField
              label="Etkinlik Açıklaması"
              multiline
              minRows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 1 }}>
              <Button variant="outlined" onClick={() => navigate("/home")}>Vazgeç</Button>
              <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Kaydediliyor..." : "Oluştur"}
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Container>

      <Snackbar
        open={okOpen}
        autoHideDuration={2500}
        onClose={() => setOkOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
          Etkinlik başarıyla oluşturuldu.
        </Alert>
      </Snackbar>
    </>
  );
}
