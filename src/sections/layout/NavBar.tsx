import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import { useEffect, useState } from "react";
import NavMenu from "./NavMenu";
import { Icon } from "@iconify/react";
import { useRouter } from "next/router";
import NavLink from "@/components/NavLink";
import Image from "next/image";
import { styled } from "@mui/material/styles";
import { Button, Stack } from "@mui/material";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

interface Props {
  darkMode: boolean;
  switchDarkMode: () => void;
}

const StyledIconButtonLink = styled("a")({
  color: "inherit",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  textDecoration: "none",
  "&:hover": {
    cursor: "pointer",
  },
});

const NAV_LINKS = [
  { label: "Analysis", href: "/", icon: "streamline:magnifying-glass-solid" },
  { label: "Insights", href: "/insights", icon: "streamline:graph-bar-increase-solid" },
  { label: "Play", href: "/play", icon: "streamline:chess-pawn" },
  { label: "Database", href: "/database", icon: "streamline:database" },
];

export default function NavBar({ darkMode, switchDarkMode }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setDrawerOpen(false);
  }, [router.pathname]);

  return (
    <Box sx={{ flexGrow: 1, display: "flex" }}>
      <AppBar position="static" enableColorOnDark>
        <Toolbar variant="dense">
          {/* Hamburger — visible on mobile only */}
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: "min(0.5vw, 0.6rem)", padding: 1, my: 1, display: { sm: "none" } }}
            onClick={() => setDrawerOpen((val) => !val)}
          >
            <Icon icon="mdi:menu" />
          </IconButton>

          {/* Logo */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mr: 3,
              "&:hover img": { filter: "drop-shadow(0 0 6px rgba(201,162,39,0.6))" },
            }}
          >
            <Image
              src="/favicon-32x32.png"
              alt="Freechess logo"
              width={28}
              height={28}
              style={{ transition: "filter 0.2s" }}
            />
            <NavLink href="/">
              <Typography
                variant="h6"
                component="div"
                sx={{
                  fontSize: { xs: "1rem", sm: "1.1rem" },
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  color: "inherit",
                }}
              >
                Freechess
              </Typography>
            </NavLink>
          </Box>

          {/* Inline nav links — desktop only */}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ display: { xs: "none", sm: "flex" }, flexGrow: 1 }}
          >
            {NAV_LINKS.map(({ label, href }) => {
              const isActive = router.pathname === href;
              return (
                <NavLink key={href} href={href}>
                  <Button
                    size="small"
                    sx={{
                      color: isActive ? "primary.main" : "text.secondary",
                      fontWeight: isActive ? 700 : 500,
                      fontSize: "0.85rem",
                      textTransform: "none",
                      px: 1.5,
                      py: 0.6,
                      borderRadius: 2,
                      position: "relative",
                      transition: "color 0.2s",
                      "&:hover": { color: "primary.main", bgcolor: "rgba(201,162,39,0.08)" },
                      ...(isActive && {
                        "&::after": {
                          content: '""',
                          position: "absolute",
                          bottom: -1,
                          left: "20%",
                          right: "20%",
                          height: "2px",
                          borderRadius: "2px",
                          bgcolor: "primary.main",
                        },
                      }),
                    }}
                  >
                    {label}
                  </Button>
                </NavLink>
              );
            })}
          </Stack>

          {/* Right-side icons */}
          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 0.5 }}>
            <Show when="signed-out">
              <SignInButton mode="modal">
                <Button
                  size="small"
                  sx={{ textTransform: "none", minWidth: "auto", px: 1.2 }}
                  color="inherit"
                >
                  Sign In
                </Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button
                  size="small"
                  variant="contained"
                  sx={{ textTransform: "none", minWidth: "auto", px: 1.2 }}
                >
                  Sign Up
                </Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <UserButton
                appearance={{
                  elements: {
                    userButtonAvatarBox: {
                      width: "28px",
                      height: "28px",
                    },
                  },
                }}
              />
            </Show>
            <StyledIconButtonLink
              href="https://discord.gg/Yr99abAcUr"
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconButton color="inherit" component="span" size="small" sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}>
                <Icon icon="ri:discord-fill" />
              </IconButton>
            </StyledIconButtonLink>

            <StyledIconButtonLink
              href="https://github.com/Theprathamshah/Freechess"
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconButton color="inherit" component="span" size="small" sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}>
                <Icon icon="mdi:github" />
              </IconButton>
            </StyledIconButtonLink>

            <IconButton
              onClick={switchDarkMode}
              color="inherit"
              edge="end"
              size="small"
              sx={{ opacity: 0.7, "&:hover": { opacity: 1 } }}
            >
              {darkMode ? (
                <Icon icon="mdi:brightness-7" />
              ) : (
                <Icon icon="mdi:brightness-4" />
              )}
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer — mobile only */}
      <NavMenu open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </Box>
  );
}
