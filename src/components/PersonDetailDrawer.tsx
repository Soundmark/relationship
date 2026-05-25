import { useState, useEffect, useCallback } from "react";
import {
  Drawer,
  Avatar,
  Button,
  Space,
  Typography,
  Divider,
  App,
} from "antd";
import {
  UserOutlined,
  PhoneOutlined,
  CalendarOutlined,
  FileTextOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleFilled,
  LinkOutlined,
} from "@ant-design/icons";
import type { Person, Relationship } from "@/types";
import { db } from "@/db";

const { Title, Text } = Typography;

interface PersonDetailDrawerProps {
  person: Person | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (person: Person) => void;
  onDelete?: (person: Person) => void;
}

export function PersonDetailDrawer({
  person,
  open,
  onClose,
  onEdit,
  onDelete,
}: PersonDetailDrawerProps) {
  const [deleting, setDeleting] = useState(false);
  const [relations, setRelations] = useState<Relationship[]>([]);
  const [relatedPersons, setRelatedPersons] = useState<Map<string, Person>>(new Map());
  const { modal } = App.useApp();

  // Load relationships function
  const loadRelations = useCallback(async () => {
    if (!person) return;
    try {
      const [asSource, asTarget] = await Promise.all([
        db.relationships.where("fromPersonId").equals(person.id).toArray(),
        db.relationships.where("toPersonId").equals(person.id).toArray(),
      ]);

      const allRelations = [...asSource, ...asTarget];
      setRelations(allRelations);

      // Load related persons
      const relatedIds = new Set<string>();
      asSource.forEach((r) => relatedIds.add(r.toPersonId));
      asTarget.forEach((r) => relatedIds.add(r.fromPersonId));

      if (relatedIds.size > 0) {
        const personsData = await db.persons
          .where("id")
          .anyOf(Array.from(relatedIds))
          .toArray();
        const personsMap = new Map(personsData.map((p) => [p.id, p]));
        setRelatedPersons(personsMap);
      } else {
        setRelatedPersons(new Map());
      }
    } catch {
      // Error handling
    }
  }, [person]);

  // Load relationships when drawer opens
  useEffect(() => {
    if (open && person) {
      loadRelations();
    }
  }, [open, person?.id, loadRelations]);

  if (!person) return null;

  const getRelationDisplay = (relation: Relationship) => {
    const isSource = relation.fromPersonId === person.id;
    const otherId = isSource ? relation.toPersonId : relation.fromPersonId;
    const otherPerson = relatedPersons.get(otherId);
    if (!otherPerson) return null;

    return {
      name: otherPerson.name,
      label: relation.relationLabel,
      direction: isSource ? "to" : "from",
    };
  };

  const handleDelete = () => {
    modal.confirm({
      title: "确认删除",
      icon: <ExclamationCircleFilled />,
      content: `确定要删除「${person.name}」吗？此操作将同时删除相关的亲属关系，且无法撤销。`,
      okText: "删除",
      okType: "danger",
      cancelText: "取消",
      onOk: async () => {
        setDeleting(true);
        try {
          await onDelete?.(person);
          onClose();
        } finally {
          setDeleting(false);
        }
      },
    });
  };

  const infoItems = [
    {
      icon: <PhoneOutlined style={{ color: "#8FA88F" }} />,
      label: "电话",
      value: person.phone,
    },
    {
      icon: <CalendarOutlined style={{ color: "#D4A574" }} />,
      label: "生日",
      value: person.birthday,
    },
    {
      icon: <FileTextOutlined style={{ color: "#A89880" }} />,
      label: "备注",
      value: person.notes,
    },
  ];

  return (
    <Drawer
      placement="bottom"
      closable={true}
      onClose={onClose}
      open={open}
      height="auto"
      maskClosable={true}
      styles={{
        header: {
          borderBottom: "none",
          padding: "16px 20px 0",
        },
        body: {
          padding: "20px",
          paddingBottom: "32px",
        },
        content: {
          borderRadius: "20px 20px 0 0",
          backgroundColor: "#FFFBF7",
        },
      }}
    >
      <div className="flex flex-col items-center">
        {/* Drag handle indicator */}
        <div
          className="w-12 h-1 rounded-full mb-6"
          style={{ backgroundColor: "#E8DED0" }}
        />

        {/* Avatar & Name */}
        <Avatar
          size={80}
          src={person.photo}
          icon={<UserOutlined />}
          style={{
            backgroundColor: person.photo ? undefined : "#E8A87C",
            border: "3px solid #FFF8F0",
            boxShadow: "0 4px 12px rgba(139, 94, 60, 0.2)",
            marginBottom: 16,
          }}
        />

        <Title
          level={4}
          style={{
            margin: 0,
            marginBottom: 4,
            color: "#5C4A3D",
            fontWeight: 600,
          }}
        >
          {person.name}
        </Title>

        {(person.iCall || person.callMe) && (
          <Space size="small">
            {person.iCall && (
              <Text
                style={{
                  fontSize: 13,
                  color: "#C17F59",
                  backgroundColor: "rgba(232, 168, 124, 0.15)",
                  padding: "4px 12px",
                  borderRadius: 12,
                }}
              >
                我称呼TA：{person.iCall}
              </Text>
            )}
          </Space>
        )}

        {/* Info List */}
        <div className="w-full mt-6 space-y-4">
          {infoItems.map(
            (item) =>
              item.value && (
                <div key={item.label} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "rgba(232, 168, 124, 0.1)" }}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#A89880",
                        display: "block",
                        marginBottom: 2,
                      }}
                    >
                      {item.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 15,
                        color: "#5C4A3D",
                        wordBreak: "break-word",
                      }}
                    >
                      {item.value}
                    </Text>
                  </div>
                </div>
              ),
          )}
        </div>

        {/* Relations Section - Read Only */}
        {relations.length > 0 && (
          <>
            <Divider style={{ borderColor: "#E8DED0", margin: "24px 0 16px" }} />
            <div className="w-full">
              <div className="flex items-center justify-between mb-3">
                <Text
                  style={{
                    fontSize: 14,
                    color: "#5C4A3D",
                    fontWeight: 500,
                  }}
                >
                  关系网络
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#A89880",
                  }}
                >
                  {relations.length} 个关系
                </Text>
              </div>
              <div className="space-y-2">
                {relations.map((relation) => {
                  const display = getRelationDisplay(relation);
                  if (!display) return null;
                  return (
                    <div
                      key={relation.id}
                      className="flex items-center p-3 rounded-xl"
                      style={{ backgroundColor: "rgba(232, 168, 124, 0.08)" }}
                    >
                      <LinkOutlined style={{ color: "#C17F59", fontSize: 14, marginRight: 8 }} />
                      <Text style={{ fontSize: 14, color: "#5C4A3D" }}>
                        {display.direction === "to" ? "→" : "←"} {display.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#A89880",
                          backgroundColor: "rgba(232, 168, 124, 0.15)",
                          padding: "2px 8px",
                          borderRadius: 10,
                          marginLeft: 8,
                        }}
                      >
                        {display.label}
                      </Text>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        <Divider style={{ borderColor: "#E8DED0", margin: "24px 0" }} />

        {/* Action Buttons */}
        <div className="w-full flex gap-3">
          <Button
            size="large"
            icon={<EditOutlined />}
            onClick={() => onEdit?.(person)}
            style={{
              flex: 1,
              borderRadius: 12,
              height: 48,
              borderColor: "#E8A87C",
              color: "#C17F59",
            }}
          >
            编辑
          </Button>
          <Button
            size="large"
            type="primary"
            danger
            icon={<DeleteOutlined />}
            loading={deleting}
            onClick={handleDelete}
            style={{
              flex: 1,
              borderRadius: 12,
              height: 48,
              backgroundColor: "#D9706C",
            }}
          >
            删除
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
