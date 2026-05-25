import "@/styles/globals.css";
import { ConfigProvider, theme, App as AntApp } from "antd";
import type { AppProps } from "next/app";

// Custom theme configuration for 亲友圈
const customTheme = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: "#E8A87C",
    colorBgContainer: "#FFFFFF",
    colorBgLayout: "#F5F1EB",
    colorText: "#4A4A4A",
    colorTextSecondary: "#8B8B8B",
    borderRadius: 12,
    controlHeight: 44,
  },
  components: {
    Card: {
      borderRadius: 16,
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
    },
    Tabs: {
      cardBg: "#F5F1EB",
    },
    FloatButton: {
      colorBgElevated: "#E8A87C",
    },
  },
};

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ConfigProvider theme={customTheme}>
      <AntApp>
        <Component {...pageProps} />
      </AntApp>
    </ConfigProvider>
  );
}
