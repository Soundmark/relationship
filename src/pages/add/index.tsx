import { useState, useRef, useMemo } from "react";
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
  LinkOutlined,
  PlusOutlined,
  CloseOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { db } from "@/db";
import { usePersons } from "@/hooks/usePersons";
import ImageCropper from "@/components/ImageCropper";
import RelationshipCalculator from "@/components/RelationshipCalculator";
import type { Person } from "@/types";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface RelationEntry {
  toPersonId: string;
  label: string;
}

export default function AddPerson() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { persons } = usePersons();

  const [name, setName] = useState("");
  const [iCall, setICall] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState("");
  const [saving, setSaving] = useState(false);
  const [relations, setRelations] = useState<RelationEntry[]>([]);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [calculatorRelationIndex, setCalculatorRelationIndex] = useState<
    number | null
  >(null);

  // Image cropper state
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperImage, setCropperImage] = useState("");

  // 可选的关联人员列表（排除当前正在添加的人）
  const availablePersons = useMemo(() => {
    return persons.filter((p) => p.name !== name.trim());
  }, [persons, name]);

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

  const inputStyle = {
    borderRadius: 12,
    height: 44,
    fontSize: 15,
  };

  const handleAddRelation = () => {
    setRelations((prev) => [...prev, { toPersonId: "", label: "" }]);
  };

  const handleRemoveRelation = (index: number) => {
    setRelations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRelationChange = (
    index: number,
    field: keyof RelationEntry,
    value: string
  ) => {
    setRelations((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      message.warning("请输入姓名");
      return;
    }

    // 验证关系数据
    const validRelations = relations.filter(
      (r) => r.toPersonId && r.label.trim()
    );
    const invalidRelations = relations.filter(
      (r) => (r.toPersonId && !r.label.trim()) || (!r.toPersonId && r.label.trim())
    );
    if (invalidRelations.length > 0) {
      message.warning("请完善关系信息：选择人员并填写关系称呼");
      return;
    }

    setSaving(true);
    try {
      const personId = crypto.randomUUID();
      const now = Date.now();

      const person: Person = {
        id: personId,
        name: name.trim(),
        iCall: iCall.trim() || undefined,
        phone: phone.trim() || undefined,
        birthday: birthday || undefined,
        notes: notes.trim() || undefined,
        photo: photo || undefined,
        createdAt: now,
        updatedAt: now,
      };

      // 使用事务保存人员和关系
      await db.transaction("rw", db.persons, db.relationships, async () => {
        await db.persons.add(person);

        // 保存关系
        for (const relation of validRelations) {
          await db.relationships.add({
            id: crypto.randomUUID(),
            fromPersonId: personId,
            toPersonId: relation.toPersonId,
            relationLabel: relation.label.trim(),
          });
        }
      });

      message.success("添加成功");
      router.replace("/");
    } catch {
      message.error("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

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
          添加亲友
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
                onClick={() => {
                  setCalculatorRelationIndex(null);
                  setCalculatorOpen(true);
                }}
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

          {/* Relations Section */}
          {availablePersons.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <Text
                  style={{
                    fontSize: 14,
                    color: "#5C4A3D",
                    fontWeight: 500,
                  }}
                >
                  与TA的关系
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#A89880",
                  }}
                >
                  可选
                </Text>
              </div>

              <div className="space-y-3">
                {relations.map((relation, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 rounded-xl"
                    style={{ backgroundColor: "#FFFBF7" }}
                  >
                    <Select
                      placeholder="选择人员"
                      style={{ flex: 1 }}
                      value={relation.toPersonId || undefined}
                      onChange={(value) =>
                        handleRelationChange(index, "toPersonId", value)
                      }
                      options={availablePersons.map((p) => ({
                        value: p.id,
                        label: p.name,
                      }))}
                    />
                    <Input
                      placeholder="关系，如：父子"
                      style={{ flex: 1 }}
                      value={relation.label}
                      onChange={(e) =>
                        handleRelationChange(index, "label", e.target.value)
                      }
                    />
                    <Button
                      type="text"
                      icon={<CalculatorOutlined />}
                      onClick={() => {
                        setCalculatorRelationIndex(index);
                        setCalculatorOpen(true);
                      }}
                      style={{ color: "#C17F59" }}
                    />
                    <Button
                      type="text"
                      icon={<CloseOutlined />}
                      onClick={() => handleRemoveRelation(index)}
                      style={{ color: "#D9706C" }}
                    />
                  </div>
                ))}

                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={handleAddRelation}
                  style={{
                    borderRadius: 12,
                    borderColor: "#E8A87C",
                    color: "#C17F59",
                    height: 44,
                  }}
                >
                  添加关系
                </Button>
              </div>
            </div>
          )}

          {/* Expandable section: phone, birthday, notes */}
          <div
            className="rounded-2xl overflow-hidden"
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
        onSelect={(result) => {
          if (calculatorRelationIndex !== null) {
            handleRelationChange(calculatorRelationIndex, "label", result);
          } else {
            setICall(result);
          }
        }}
      />
    </div>
  );
}
