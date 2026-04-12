import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { PropsWithChildren, useMemo } from "react";
import NavBar from "./NavBar";
import { red } from "@mui/material/colors";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { MAIN_THEME_COLOR } from "@/constants";
import { useRouter } from "next/router";

export default function Layout({ children }: PropsWithChildren) {
  const [isDarkMode, setDarkMode] = useLocalStorage("useDarkMode", true);
  const router = useRouter();

  // Insights page is full-bleed (owns its own background)
  const isFullBleedPage = router.pathname === "/insights";

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: isDarkMode ? "dark" : "light",
          error: {
            main: red[400],
          },
          primary: {
            main: MAIN_THEME_COLOR,
            contrastText: "#0d0d0f",
          },
          secondary: {
            main: isDarkMode ? "#4a9eff" : "#1565c0",
          },
          ...(isDarkMode && {
            background: {
              default: "#0d0d0f",
              paper: "#161618",
            },
            text: {
              primary: "#e8e8ea",
              secondary: "#8a8a96",
            },
          }),
        },
        typography: {
          fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
          h1: { letterSpacing: "-0.5px", fontWeight: 800 },
          h2: { letterSpacing: "-0.5px", fontWeight: 700 },
          h3: { letterSpacing: "-0.25px", fontWeight: 700 },
          h4: { letterSpacing: "-0.25px", fontWeight: 700 },
          h5: { letterSpacing: "-0.1px", fontWeight: 600 },
          h6: { fontWeight: 600 },
        },
        shape: {
          borderRadius: 10,
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: ({ theme }) => ({
                ...(theme.palette.mode === "dark" && {
                  backgroundImage: "none",
                  backgroundColor: theme.palette.background.paper,
                  border: "1px solid rgba(255,255,255,0.06)",
                }),
              }),
            },
          },
          MuiButton: {
            styleOverrides: {
              contained: {
                boxShadow: "none",
                "&:hover": { boxShadow: "none" },
              },
            },
          },
          MuiTab: {
            styleOverrides: {
              root: {
                textTransform: "none",
                fontWeight: 500,
                letterSpacing: "0.01em",
              },
            },
          },
          MuiChip: {
            styleOverrides: {
              root: ({ theme }) => ({
                ...(theme.palette.mode === "dark" && {
                  borderColor: "rgba(255,255,255,0.12)",
                }),
              }),
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: ({ theme }) => ({
                ...(theme.palette.mode === "dark" && {
                  backgroundColor: "#111113",
                  backgroundImage: "none",
                  borderRight: "1px solid rgba(201,162,39,0.15)",
                }),
              }),
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: ({ theme }) => ({
                ...(theme.palette.mode === "dark" && {
                  backgroundColor: "#0d0d0f",
                  backgroundImage: "none",
                  borderBottom: "1px solid rgba(201,162,39,0.15)",
                  boxShadow: "none",
                }),
              }),
            },
          },
          MuiToggleButton: {
            styleOverrides: {
              root: ({ theme }) => ({
                textTransform: "none",
                ...(theme.palette.mode === "dark" && {
                  borderColor: "rgba(255,255,255,0.12)",
                  "&.Mui-selected": {
                    backgroundColor: "rgba(201,162,39,0.12)",
                    borderColor: "rgba(201,162,39,0.4)",
                    color: "#c9a227",
                  },
                }),
              }),
            },
          },
        },
      }),
    [isDarkMode]
  );

  if (isDarkMode === null) return null;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NavBar
        darkMode={isDarkMode}
        switchDarkMode={() => setDarkMode((val) => !val)}
      />
      <main
        style={{
          margin: isFullBleedPage ? 0 : "2vh 1vw",
        }}
      >
        {children}
      </main>
    </ThemeProvider>
  );
}
