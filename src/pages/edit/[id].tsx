import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import {
  Input,
  Button,
  Typography,
  Collapse,
  DatePicker,
  message,
  Select,
} from "antd";
import {
  ArrowLeftOutlined,
  CameraOutlined,
  CalculatorOutlined,
  PlusOutlined,
  CloseOutlined,
  LinkOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { db } from "@/db";
import { usePersons } from "@/hooks/usePersons";
import ImageCropper from "@/components/ImageCropper";
import RelationshipCalculator from "@/components/RelationshipCalculator";
import type { Person, Relationship, RelationshipType } from "@/types";

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function EditPerson() {
  const router = useRouter();
  const { id } = router.query;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { persons } = usePersons();

  const [name, setName] = useState("");
  const [iCall, setICall] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Image cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState("");

  // Relationship calculator state
  const [calculatorOpen, setCalculatorOpen] = useState(false);

  // Relations management
  const [relations, setRelations] = useState<Relationship[]>([]);
  const [relatedPersons, setRelatedPersons] = useState<Map<string, Person>>(new Map());
  const [newRelationToId, setNewRelationToId] = useState<string>("");
  const [newRelationType, setNewRelationType] = useState<RelationshipType>("other");

  // Load person data and relations
  useEffect(() => {
    if (!id || typeof id !== "string") return;

    const loadData = async () => {
      try {
        const person = await db.persons.get(id);
        if (!person) {
          message.error("找不到该亲友");
          router.replace("/");
          return;
        }
        setName(person.name);
        setICall(person.iCall || "");
        setPhone(person.phone || "");
        setBirthday(person.birthday || "");
        setNotes(person.notes || "");
        setPhoto(person.photo || "");

        // Load relations
        await loadRelations(id);
      } catch {
        message.error("加载数据失败");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, router]);

  const loadRelations = async (personId: string) => {
    try {
      const [asSource, asTarget] = await Promise.all([
        db.relationships.where("fromPersonId").equals(personId).toArray(),
        db.relationships.where("toPersonId").equals(personId).toArray(),
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
  };

  const handleAddRelation = async () => {
    if (!id || typeof id !== "string") return;
    if (!newRelationToId) {
      message.warning("请选择人员");
      return;
    }

    try {
      await db.relationships.add({
        id: crypto.randomUUID(),
        fromPersonId: id,
        toPersonId: newRelationToId,
        type: newRelationType,
      });

      message.success("关系添加成功");
      setNewRelationToId("");
      setNewRelationType("other");
      await loadRelations(id);
    } catch {
      message.error("添加关系失败");
    }
  };

  const handleDeleteRelation = async (relationId: string) => {
    if (!id || typeof id !== "string") return;

    try {
      await db.relationships.delete(relationId);
      message.success("关系已删除");
      await loadRelations(id);
    } catch {
      message.error("删除关系失败");
    }
  };

  const relationTypeLabel: Record<string, string> = {
    "parent-child": "子女",
    spouse: "夫妻",
    sibling: "兄弟姐妹",
    other: "其他",
  };

  const getRelationDisplay = (relation: Relationship) => {
    if (!id || typeof id !== "string") return null;
    const isSource = relation.fromPersonId === id;
    const otherId = isSource ? relation.toPersonId : relation.fromPersonId;
    const otherPerson = relatedPersons.get(otherId);
    if (!otherPerson) return null;

    return {
      name: otherPerson.name,
      typeLabel: relationTypeLabel[relation.type] || "其他",
      direction: isSource ? "to" : "from",
    };
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropperImage(ev.target?.result as string);
      setCropperOpen(true);
    };
    reader.readAsDataURL(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCropConfirm = (croppedImage: string) => {
    setPhoto(croppedImage);
    setCropperOpen(false);
    setCropperImage("");
  };

  const handleCropCancel = () => {
    setCropperOpen(false);
    setCropperImage("");
  };

  const handleSave = async () => {
    if (!name.trim()) {
      message.warning("请输入姓名");
      return;
    }

    if (!id || typeof id !== "string") return;

    setSaving(true);
    try {
      const updates: Partial<Person> = {
        name: name.trim(),
        iCall: iCall.trim() || undefined,
        phone: phone.trim() || undefined,
        birthday: birthday || undefined,
        notes: notes.trim() || undefined,
        photo: photo || undefined,
        updatedAt: Date.now(),
      };

      await db.persons.update(id, updates);
      message.success("保存成功");
      router.replace("/");
    } catch {
      message.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    borderRadius: 12,
    height: 44,
    fontSize: 15,
  };

  if (loading) {
    return (
      <div className="max-w-[480px] mx-auto h-dvh bg-[#FAF6F0] flex items-center justify-center">
        <Text style={{ color: "#8B7355" }}>加载中...</Text>
      </div>
    );
  }

  return (
    <div className="max-w-[480px] mx-auto h-dvh bg-[#FAF6F0] flex flex-col">
      {/* Header */}
      <header
        className="px-4 py-3 bg-[#FFFBF7] flex items-center gap-3 shrink-0"
        style={{
          boxShadow: "0 1px 3px rgba(139, 94, 60, 0.08)",
        }}
      >
        <Button
          type="text"
          icon={<ArrowLeftOutlined style={{ fontSize: 20, color: "#5C4A3D" }} />}
          onClick={() => router.back()}
          style={{ width: 40, height: 40 }}
        />
        <Title level={4} style={{ margin: 0, color: "#5C4A3D", fontWeight: 600 }}>
          编辑亲友
        </Title>
      </header>

      {/* Form Content */}
      <div className="flex-1 overflow-auto px-5 py-6">
        {/* Photo Picker */}
        <div className="flex justify-center mb-8">
          <div
            onClick={handlePhotoClick}
            className="relative cursor-pointer"
            style={{ width: 80, height: 80 }}
          >
            <div
              className="w-full h-full rounded-full flex items-center justify-center overflow-hidden"
              style={{
                backgroundColor: photo ? "transparent" : "#F0E8DE",
                border: "3px solid #FFFFFF",
                boxShadow: "0 2px 12px rgba(139, 94, 60, 0.15)",
              }}
            >
              {photo ? (
                <img
                  src={photo}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <CameraOutlined style={{ fontSize: 28, color: "#C4AFA0" }} />
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col gap-5">
          {/* Name - Required */}
          <div>
            <Text
              style={{
                fontSize: 14,
                color: "#5C4A3D",
                fontWeight: 500,
                marginBottom: 6,
                display: "block",
              }}
            >
              姓名 <span style={{ color: "#E8A87C" }}>*</span>
            </Text>
            <Input
              placeholder="请输入姓名"
              value={name}
              onChange={(e) => setName(e.target.value)}
              variant="filled"
              style={{
                ...inputStyle,
                backgroundColor: "#FFFBF7",
              }}
            />
          </div>

          {/* iCall - 我称呼TA */}
          <div>
            <Text
              style={{
                fontSize: 14,
                color: "#5C4A3D",
                fontWeight: 500,
                marginBottom: 6,
                display: "block",
              }}
            >
              我称呼TA
            </Text>
            <div className="flex gap-2">
              <Input
                placeholder="如：表哥、婶婶"
                value={iCall}
                onChange={(e) => setICall(e.target.value)}
                variant="filled"
                style={{
                  ...inputStyle,
                  flex: 1,
                  backgroundColor: "#FFFBF7",
                }}
              />
              <Button
                icon={<CalculatorOutlined />}
                onClick={() => setCalculatorOpen(true)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  borderColor: "#E8A87C",
                  color: "#C17F59",
                }}
              />
            </div>
          </div>

          {/* Relations Management */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <Text
                style={{
                  fontSize: 14,
                  color: "#5C4A3D",
                  fontWeight: 500,
                }}
              >
                关系管理
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

            {/* Existing Relations */}
            <div className="space-y-2 mb-4">
              {relations.map((relation) => {
                const display = getRelationDisplay(relation);
                if (!display) return null;
                return (
                  <div
                    key={relation.id}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ backgroundColor: "rgba(232, 168, 124, 0.08)" }}
                  >
                    <div className="flex items-center gap-2">
                      <LinkOutlined
                        style={{ color: "#C17F59", fontSize: 14 }}
                      />
                      <Text style={{ fontSize: 14, color: "#5C4A3D" }}>
                        {display.direction === "to" ? "→" : "←"}{" "}
                        {display.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#A89880",
                          backgroundColor: "rgba(232, 168, 124, 0.15)",
                          padding: "2px 8px",
                          borderRadius: 10,
                        }}
                      >
                        {display.typeLabel}
                      </Text>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      icon={<CloseOutlined style={{ fontSize: 12 }} />}
                      onClick={() => handleDeleteRelation(relation.id)}
                      style={{ color: "#D9706C" }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Add New Relation */}
            {persons.length > 1 && (
              <div
                className="p-3 rounded-xl"
                style={{ backgroundColor: "#F5F1EB" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Select
                    placeholder="选择人员"
                    style={{ flex: 1 }}
                    value={newRelationToId || undefined}
                    onChange={setNewRelationToId}
                    options={persons
                      .filter((p) => p.id !== id)
                      .map((p) => ({
                        value: p.id,
                        label: p.name,
                      }))}
                  />
                  <Select
                    placeholder="关系类型"
                    style={{ width: 130 }}
                    value={newRelationType}
                    onChange={setNewRelationType}
                    options={[
                      { value: "parent-child", label: "子女" },
                      { value: "spouse", label: "夫妻" },
                      { value: "sibling", label: "兄弟姐妹" },
                      { value: "other", label: "其他" },
                    ]}
                  />
                </div>
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  disabled={!newRelationToId}
                  onClick={handleAddRelation}
                  style={{
                    borderRadius: 12,
                    borderColor: "#E8A87C",
                    color: "#C17F59",
                    height: 40,
                  }}
                >
                  添加关系
                </Button>
              </div>
            )}
          </div>

          {/* Expandable section: phone, birthday, notes */}
          <div
            className="rounded-2xl overflow-hidden mt-6"
            style={{ backgroundColor: "#FFFBF7" }}
          >
            <Collapse
              ghost
              expandIconPlacement="end"
              items={[
                {
                  key: "more",
                  label: (
                    <Text style={{ fontSize: 14, color: "#8B7355" }}>
                      更多信息
                    </Text>
                  ),
                  children: (
                    <div className="flex flex-col gap-4">
                      {/* Phone */}
                      <div>
                        <Text
                          style={{
                            fontSize: 13,
                            color: "#8B7355",
                            marginBottom: 4,
                            display: "block",
                          }}
                        >
                          电话
                        </Text>
                        <Input
                          placeholder="请输入电话号码"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          variant="filled"
                          style={{
                            ...inputStyle,
                            height: 40,
                            fontSize: 14,
                            backgroundColor: "#FAF6F0",
                          }}
                        />
                      </div>

                      {/* Birthday */}
                      <div>
                        <Text
                          style={{
                            fontSize: 13,
                            color: "#8B7355",
                            marginBottom: 4,
                            display: "block",
                          }}
                        >
                          生日
                        </Text>
                        <DatePicker
                          style={{
                            ...inputStyle,
                            height: 40,
                            fontSize: 14,
                            width: "100%",
                            backgroundColor: "#FAF6F0",
                          }}
                          variant="filled"
                          placeholder="选择日期"
                          inputReadOnly
                          value={birthday ? dayjs(birthday) : undefined}
                          onChange={(_, dateStr) =>
                            setBirthday(dateStr as string)
                          }
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <Text
                          style={{
                            fontSize: 13,
                            color: "#8B7355",
                            marginBottom: 4,
                            display: "block",
                          }}
                        >
                          备注
                        </Text>
                        <TextArea
                          placeholder="添加备注信息"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={3}
                          variant="filled"
                          style={{
                            borderRadius: 12,
                            fontSize: 14,
                            backgroundColor: "#FAF6F0",
                          }}
                        />
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div
        className="px-5 py-4 shrink-0"
        style={{ backgroundColor: "#FFFBF7" }}
      >
        <Button
          type="primary"
          size="large"
          block
          disabled={!name.trim() || saving}
          loading={saving}
          onClick={handleSave}
          style={{
            height: 48,
            borderRadius: 24,
            fontSize: 16,
            fontWeight: 600,
            backgroundColor: name.trim() ? "#E8A87C" : undefined,
            border: "none",
          }}
        >
          保存
        </Button>
      </div>

      {/* Image Cropper Modal */}
      <ImageCropper
        imageSrc={cropperImage}
        open={cropperOpen}
        onCancel={handleCropCancel}
        onConfirm={handleCropConfirm}
      />

      {/* Relationship Calculator */}
      <RelationshipCalculator
        open={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        onSelect={(result) => setICall(result)}
      />
    </div>
  );
}
