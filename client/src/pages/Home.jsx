import { AppBar, Toolbar, Typography, Button, Container, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getUserRole } from "../auth/token";

export default function Home() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);

  useEffect(() => {
    setRole(getUserRole());
  }, []);

  const isManager = role === "Manager" || role === "Admin";

  return (
    <>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            UniMeet — Ana Sayfa
          </Typography>

          {/* Sadece kulüp yöneticileri bu butonu görür */}
          {isManager && (
            <Button variant="contained" onClick={() => navigate("/manageevents")}>
              Etkinlik Oluştur
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg">
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Hoş geldin! 🎉
          </Typography>
          <Typography color="text.secondary">
            Buradan kulüp etkinliklerini görüntüleyebilir veya sağ üstten yeni etkinlik oluşturabilirsin.
          </Typography>
        </Box>
      </Container>
    </>
  );
}
