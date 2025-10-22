import { useEffect, useState } from "react";
import {
  AppBar, Toolbar, Typography, Container, Paper, Stack,
  TextField, Button, Snackbar, Alert, Box, FormControl,
  InputLabel, Select, MenuItem
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { api } from "../api/index";

export default function ManageEvents() {
  const navigate = useNavigate();

  // Form state
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState(""); // YYYY-MM-DD
  const [eventTime, setEventTime] = useState(""); // HH:mm
  const [quota, setQuota] = useState("");
  const [clubId, setClubId] = useState("");
  const [description, setDescription] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [okOpen, setOkOpen] = useState(false);

  // Kulüp listesi
  const [clubs, setClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(true);

  // Kulüpleri yükle
  useEffect(() => {
    let ignore = false;
    setClubsLoading(true);
    api.get("/api/Clubs")
      .then(res => {
        if (ignore) return;
        setClubs(Array.isArray(res.data) ? res.data : []);
      })
      .catch(err => {
        console.error("Clubs fetch error:", err);
        setClubs([]);
      })
      .finally(() => !ignore && setClubsLoading(false));
    return () => { ignore = true; };
  }, []);

  // Doğrulama
  const validate = () => {
    if (!title.trim()) return "Etkinlik adı zorunludur.";
    if (!location.trim()) return "Etkinlik yeri zorunludur.";
    if (!eventDate) return "Etkinlik tarihi zorunludur.";
    if (!eventTime) return "Etkinlik saati zorunludur.";
    if (!quota || isNaN(Number(quota)) || Number(quota) <= 0)
      return "Kontenjan pozitif bir sayı olmalıdır.";
    if (!clubId) return "Lütfen bir kulüp seçin.";
    return "";
  };

  const hasErrors = !!validate();

  // Tarih + saat -> ISO (yerel saatten)
  const toIsoFromDateTime = (dateStr, timeStr) => {
    const combined = `${dateStr}T${timeStr}`;
    const d = new Date(combined);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
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
      const payload = {
        title: title.trim(),
        location: location.trim(),
        startAt: toIsoFromDateTime(eventDate, eventTime), // sadece başlangıç
        endAt: null,                                      // backend tolere eder
        quota: Number(quota),
        clubId: parseInt(clubId, 10),
        description: description.trim() || null,
      };

      await api.post("/api/Events", payload);

      // Başarılı -> anasayfaya dön ve listede gör
      setOkOpen(true);
      navigate("/home");

      // (navigate öncesi form temizliği istersen)
      setTitle("");
      setLocation("");
      setEventDate("");
      setEventTime("");
      setQuota("");
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <TextField
              label="Yer"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
            />

            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
              <TextField
                label="Tarih"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                label="Saat"
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Box>

            <TextField
              label="Kontenjan"
              type="number"
              inputProps={{ min: 1 }}
              value={quota}
              onChange={(e) => setQuota(e.target.value)}
              required
            />

            <FormControl fullWidth required>
              <InputLabel id="club-label">Kulüp</InputLabel>
              <Select
                labelId="club-label"
                label="Kulüp"
                value={clubId}
                onChange={(e) => setClubId(e.target.value)}
                disabled={clubsLoading}
              >
                {clubs.map((c) => (
                  <MenuItem key={c.clubId} value={String(c.clubId)}>
                    {c.name}
                  </MenuItem>
                ))}
                {!clubsLoading && clubs.length === 0 && (
                  <MenuItem disabled>Hiç kulüp bulunamadı</MenuItem>
                )}
              </Select>
            </FormControl>

            <TextField
              label="Etkinlik Açıklaması"
              multiline
              minRows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end", mt: 1 }}>
              <Button variant="outlined" onClick={() => navigate("/home")}>Vazgeç</Button>
              <Button variant="contained" onClick={handleSubmit} disabled={submitting || hasErrors}>
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
