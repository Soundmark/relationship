import { useState, useMemo } from "react";
import { useRouter } from "next/router";
import {
  Tabs,
  Card,
  Avatar,
  Input,
  Button,
  FloatButton,
  Empty,
  Typography,
  Space,
  message,
} from "antd";
import {
  SettingOutlined,
  SearchOutlined,
  PlusOutlined,
  UserOutlined,
  TeamOutlined,
  ShareAltOutlined,
  PhoneOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import type { Person } from "@/types";
import { usePersons } from "@/hooks/usePersons";
import { useRelationshipGraph } from "@/hooks/useRelationshipGraph";
import { PersonDetailDrawer } from "@/components/PersonDetailDrawer";
import { RelationGraph } from "@/components/RelationGraph";

const { Title, Text } = Typography;
const { Search } = Input;

export default function Home() {
  const [activeTab, setActiveTab] = useState<"list" | "graph">("list");
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const { persons, deletePerson } = usePersons();
  const { nodes: graphNodes, links: graphLinks } = useRelationshipGraph();
  const router = useRouter();

  const filteredPersons = useMemo(() => {
    if (!searchQuery.trim()) return persons;
    const query = searchQuery.toLowerCase();
    return persons.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.iCall?.toLowerCase().includes(query) ||
        p.callMe?.toLowerCase().includes(query),
    );
  }, [persons, searchQuery]);

  const handleAddPerson = () => {
    router.push("/add");
  };

  const handleSettings = () => {
    router.push("/settings");
  };

  const toggleSearch = () => {
    if (searchVisible) {
      setSearchQuery("");
    }
    setSearchVisible(!searchVisible);
  };

  const handleViewPerson = (person: Person) => {
    setSelectedPerson(person);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedPerson(null);
  };

  const handleDeletePerson = async (person: Person) => {
    await deletePerson(person.id);
    message.success(`已删除「${person.name}」`);
  };

  const renderPersonCard = (person: Person) => (
    <Card
      key={person.id}
      className="cursor-pointer"
      style={{
        borderRadius: 16,
        border: "none",
        backgroundColor: "#FFFBF7",
        boxShadow: "0 2px 8px rgba(139, 94, 60, 0.06)",
      }}
      styles={{
        body: {
          padding: "16px",
        },
      }}
      onClick={() => handleViewPerson(person)}
    >
      <div className="flex items-center gap-4">
        <Avatar
          size={56}
          src={person.photo}
          icon={<UserOutlined />}
          style={{
            backgroundColor: person.photo ? undefined : "#E8A87C",
            border: "2px solid #FFF8F0",
            boxShadow: "0 2px 8px rgba(139, 94, 60, 0.15)",
            flexShrink: 0,
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Text style={{ fontSize: 17, fontWeight: 600, color: "#5C4A3D" }}>
              {person.name}
            </Text>
            {person.iCall && (
              <Text
                style={{
                  fontSize: 12,
                  color: "#C17F59",
                  backgroundColor: "rgba(232, 168, 124, 0.15)",
                  padding: "2px 8px",
                  borderRadius: 10,
                }}
              >
                {person.iCall}
              </Text>
            )}
          </div>
          <div className="flex items-center gap-3">
            {person.phone && (
              <Space size={4}>
                <PhoneOutlined style={{ fontSize: 12, color: "#8FA88F" }} />
                <Text
                  type="secondary"
                  style={{ fontSize: 13, color: "#8B7355" }}
                >
                  {person.phone}
                </Text>
              </Space>
            )}
            {person.birthday && (
              <Space size={4}>
                <CalendarOutlined style={{ fontSize: 12, color: "#D4A574" }} />
                <Text
                  type="secondary"
                  style={{ fontSize: 13, color: "#8B7355" }}
                >
                  {person.birthday}
                </Text>
              </Space>
            )}
          </div>
        </div>
        <ShareAltOutlined style={{ fontSize: 18, color: "#D4C4B0" }} />
      </div>
    </Card>
  );

  const tabItems = [
    {
      key: "list",
      label: (
        <Space size="small">
          <TeamOutlined />
          <span>列表视图</span>
        </Space>
      ),
      children: (
        <div className="h-full overflow-auto p-4">
          {filteredPersons.length > 0 ? (
            <div className="flex flex-col gap-4">
              {filteredPersons.map((person) => (
                <div key={person.id}>{renderPersonCard(person)}</div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center">
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Space size="small" align="center">
                    <Text
                      type="secondary"
                      style={{ fontSize: 16, color: "#8B7355" }}
                    >
                      还没有添加亲友
                    </Text>
                    <Text
                      type="secondary"
                      className="text-sm"
                      style={{ color: "#A89880" }}
                    >
                      点击右下角按钮开始添加
                    </Text>
                  </Space>
                }
              />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "graph",
      label: (
        <Space size="small">
          <ShareAltOutlined />
          <span>关系图视图</span>
        </Space>
      ),
      children: (
        <div className="h-full">
          <RelationGraph
            nodes={graphNodes}
            links={graphLinks}
            selectedId={selectedPerson?.id}
            onNodeClick={(node) => {
              const person = persons.find((p) => p.id === node.id);
              if (person) handleViewPerson(person);
            }}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-[480px] mx-auto h-dvh bg-[#FAF6F0] flex flex-col">
      {/* Header */}
      <header
        className="px-5 py-4 bg-[#FFFBF7] flex items-center justify-between shrink-0"
        style={{
          boxShadow: "0 1px 3px rgba(139, 94, 60, 0.08)",
        }}
      >
        <Title
          level={4}
          style={{ margin: 0, color: "#5C4A3D", fontWeight: 600 }}
        >
          亲友圈
        </Title>
        <Space size="middle">
          <Button
            type="text"
            icon={<SearchOutlined style={{ fontSize: 20 }} />}
            onClick={toggleSearch}
            style={{
              color: searchVisible ? "#E8A87C" : "#8B8B8B",
              transition: "all 0.3s ease",
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: searchVisible
                ? "rgba(232, 168, 124, 0.1)"
                : "transparent",
            }}
          />
          <Button
            type="text"
            icon={<SettingOutlined style={{ fontSize: 20 }} />}
            onClick={handleSettings}
            style={{
              color: "#8B7355",
              width: 40,
              height: 40,
              borderRadius: 20,
            }}
          />
        </Space>
      </header>

      {/* Search Bar - Animated */}
      <div
        className="bg-[#FFFBF7] overflow-hidden transition-all duration-300 ease-out shrink-0"
        style={{
          maxHeight: searchVisible ? "72px" : "0",
          opacity: searchVisible ? 1 : 0,
        }}
      >
        <div className="px-5 pb-4">
          <Search
            placeholder="搜索姓名或称呼"
            allowClear
            size="large"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              borderRadius: 12,
            }}
          />
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="flex-1 overflow-hidden bg-[#FFFBF7]">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => setActiveTab(key as "list" | "graph")}
          items={tabItems}
          centered
          destroyOnHidden={false}
          tabBarStyle={{ margin: 0 }}
          className="h-full [&_.ant-tabs-nav]:bg-[#FFFBF7] [&_.ant-tabs-nav]:pt-2 [&_.ant-tabs-nav]:border-b [&_.ant-tabs-nav]:border-[#E8DED0] [&_.ant-tabs-content-holder]:h-[calc(100%-48px)] [&_.ant-tabs-content]:h-full [&_.ant-tabs-tabpane]:h-full [&_.ant-tabs-content-holder]:bg-[#FAF6F0]"
          style={{ marginBottom: 0 }}
        />
      </div>

      {/* Floating Add Button */}
      <FloatButton
        type="primary"
        icon={<PlusOutlined style={{ fontSize: 24 }} />}
        onClick={handleAddPerson}
        style={{
          right: 24,
          bottom: 24,
          width: 56,
          height: 56,
          backgroundColor: "#E8A87C",
          boxShadow: "0 4px 16px rgba(232, 168, 124, 0.5)",
        }}
      />

      {/* Person Detail Drawer */}
      <PersonDetailDrawer
        person={selectedPerson}
        open={detailOpen}
        onClose={handleCloseDetail}
        onDelete={handleDeletePerson}
        onEdit={(person) => {
          router.push(`/edit/${person.id}`);
        }}
      />
    </div>
  );
}
