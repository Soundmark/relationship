// Type for PWA install prompt event
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

import { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/router";
import {
  Button,
  Card,
  Typography,
  message,
  App,
} from "antd";
import {
  LeftOutlined,
  RightOutlined,
  UploadOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  MessageOutlined,
  MobileOutlined,
} from "@ant-design/icons";
import { db } from "@/db";
import type { Person, Relationship } from "@/types";

const { Title, Text } = Typography;

interface ExportData {
  version: string;
  exportDate: number;
  persons: Person[];
  relationships: Relationship[];
}

export default function Settings() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { modal } = App.useApp();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsInstalled(isStandalone);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      message.success("应用已安装到本地");
    };

    if (typeof window !== "undefined") {
      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.addEventListener("appinstalled", handleAppInstalled);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      }
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) {
      if (isInstalled) {
        message.info("应用已安装到本地");
      } else {
        message.info("您的浏览器暂不支持安装，可以尝试使用 Chrome 或 Safari 浏览器");
      }
      return;
    }

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === "accepted") {
      message.success("应用安装成功！");
      setInstallPrompt(null);
    }
  }, [installPrompt, isInstalled]);

  const handleBack = () => {
    router.back();
  };

  const handleExport = async () => {
    try {
      const [persons, relationships] = await Promise.all([
        db.persons.toArray(),
        db.relationships.toArray(),
      ]);

      const exportData: ExportData = {
        version: "1.0",
        exportDate: Date.now(),
        persons,
        relationships,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `亲友圈备份_${new Date().toLocaleDateString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      message.success("数据导出成功");
    } catch {
      message.error("导出失败，请重试");
    }
  };

  const handleImportClick = () => {
    modal.confirm({
      title: "确认导入数据？",
      content: "导入数据将覆盖现有所有数据，此操作不可恢复。",
      okText: "确认导入",
      cancelText: "取消",
      okButtonProps: { danger: true },
      onOk: () => {
        fileInputRef.current?.click();
      },
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data: ExportData = JSON.parse(text);

      if (!data.persons || !data.relationships) {
        throw new Error("数据格式不正确");
      }

      await db.transaction("rw", db.persons, db.relationships, async () => {
        await db.persons.clear();
        await db.relationships.clear();
        await db.persons.bulkAdd(data.persons);
        await db.relationships.bulkAdd(data.relationships);
      });

      message.success("数据导入成功");
    } catch {
      message.error("导入失败，请检查文件格式");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFeedback = () => {
    message.info("意见反馈功能开发中");
  };

  const renderSettingItem = (
    icon: React.ReactNode,
    title: string,
    onClick?: () => void,
    showArrow = true,
  ) => (
    <div
      className="flex items-center justify-between py-4 px-4 cursor-pointer transition-colors hover:bg-[#F5EDE5]"
      onClick={onClick}
      style={{
        borderBottom: "1px solid #F0E8E0",
      }}
    >
      <div className="flex items-center gap-3">
        <span style={{ color: "#C17F59", fontSize: 18 }}>{icon}</span>
        <Text style={{ fontSize: 16, color: "#5C4A3D" }}>{title}</Text>
      </div>
      {showArrow && (
        <RightOutlined style={{ fontSize: 16, color: "#D4C4B0" }} />
      )}
    </div>
  );

  return (
    <div className="max-w-[480px] mx-auto h-dvh bg-[#FAF6F0] flex flex-col">
      {/* Header */}
      <header
        className="px-4 py-4 bg-[#FFFBF7] flex items-center shrink-0"
        style={{
          boxShadow: "0 1px 3px rgba(139, 94, 60, 0.08)",
        }}
      >
        <Button
          type="text"
          icon={<LeftOutlined style={{ fontSize: 20, color: "#5C4A3D" }} />}
          onClick={handleBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            marginRight: 8,
          }}
        />
        <Title
          level={4}
          style={{
            margin: 0,
            color: "#5C4A3D",
            fontWeight: 600,
            fontSize: 18,
          }}
        >
          设置
        </Title>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* 数据管理 */}
        <div className="mb-2">
          <Text
            style={{
              fontSize: 14,
              color: "#8B7355",
              marginLeft: 12,
            }}
          >
            数据管理
          </Text>
        </div>
        <Card
          style={{
            borderRadius: 16,
            border: "none",
            backgroundColor: "#FFFBF7",
            boxShadow: "0 2px 8px rgba(139, 94, 60, 0.06)",
            marginBottom: 24,
          }}
          styles={{
            body: {
              padding: 0,
            },
          }}
        >
          {renderSettingItem(
            <DownloadOutlined />,
            "导出数据",
            handleExport,
          )}
          {renderSettingItem(
            <UploadOutlined />,
            "导入数据",
            handleImportClick,
            false,
          )}
        </Card>

        {/* 关于 */}
        <div className="mb-2">
          <Text
            style={{
              fontSize: 14,
              color: "#8B7355",
              marginLeft: 12,
            }}
          >
            关于
          </Text>
        </div>
        <Card
          style={{
            borderRadius: 16,
            border: "none",
            backgroundColor: "#FFFBF7",
            boxShadow: "0 2px 8px rgba(139, 94, 60, 0.06)",
          }}
          styles={{
            body: {
              padding: 0,
            },
          }}
        >
          {renderSettingItem(
            <InfoCircleOutlined />,
            "版本 1.0.0",
            undefined,
            false,
          )}
          {renderSettingItem(
            <MobileOutlined />,
            isInstalled ? "已安装到本地" : "安装到本地",
            handleInstall,
            !isInstalled,
          )}
          {renderSettingItem(
            <MessageOutlined />,
            "意见反馈",
            handleFeedback,
          )}
        </Card>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </div>
  );
}
