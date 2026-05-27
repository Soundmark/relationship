import { useState, useCallback } from "react";
import { Modal, Input, Button, Tag, Typography, Empty, Space } from "antd";
import { LoadingOutlined, CalculatorOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface RelationshipCalculatorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (result: string) => void;
}

export default function RelationshipCalculator({
  open,
  onClose,
  onSelect,
}: RelationshipCalculatorProps) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const [calculating, setCalculating] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleCalculate = useCallback(async () => {
    if (!text.trim()) return;

    setCalculating(true);
    setHasSearched(true);

    try {
      const { default: relationship } = await import("relationship.js");
      const res = relationship({ text: text.trim() });
      setResults(Array.isArray(res) ? res : [res]);
    } catch {
      setResults([]);
    } finally {
      setCalculating(false);
    }
  }, [text]);

  const handleSelect = useCallback(
    (result: string) => {
      onSelect(result);
      setText("");
      setResults([]);
      setHasSearched(false);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleClose = useCallback(() => {
    setText("");
    setResults([]);
    setHasSearched(false);
    onClose();
  }, [onClose]);

  return (
    <Modal
      title="关系计算器"
      open={open}
      onCancel={handleClose}
      footer={null}
      width={360}
      centered
    >
      <div className="flex flex-col gap-4 py-2">
        {/* Input row */}
        <div className="flex gap-2">
          <Input
            placeholder="如：爸爸的哥哥的儿子"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPressEnter={handleCalculate}
            variant="filled"
            style={{
              flex: 1,
              borderRadius: 10,
              fontSize: 14,
              backgroundColor: "#FFFBF7",
            }}
          />
          <Button
            type="primary"
            onClick={handleCalculate}
            loading={calculating}
            icon={calculating ? <LoadingOutlined /> : <CalculatorOutlined />}
            style={{
              backgroundColor: "#E8A87C",
              borderColor: "#E8A87C",
              borderRadius: 10,
            }}
          >
            计算
          </Button>
        </div>

        {/* Quick reference chips */}
        <div>
          <Text
            style={{
              fontSize: 12,
              color: "#8B7355",
              marginBottom: 6,
              display: "block",
            }}
          >
            常用关系
          </Text>
          <Space wrap size={[6, 6]}>
            {[
              "爸爸",
              "妈妈",
              "哥哥",
              "弟弟",
              "姐姐",
              "妹妹",
              "爷爷",
              "奶奶",
              "外公",
              "外婆",
              "丈夫",
              "妻子",
              "儿子",
              "女儿",
            ].map((chip) => (
              <Tag
                key={chip}
                onClick={() => setText((prev) => (prev ? `${prev}的${chip}` : chip))}
                style={{
                  cursor: "pointer",
                  borderRadius: 8,
                  padding: "2px 10px",
                  fontSize: 13,
                  backgroundColor: "#F0E8DE",
                  border: "none",
                  color: "#5C4A3D",
                }}
              >
                {chip}
              </Tag>
            ))}
          </Space>
        </div>

        {/* Results */}
        <div
          className="rounded-xl p-4 min-h-[80px]"
          style={{ backgroundColor: "#FAF6F0" }}
        >
          {hasSearched ? (
            results.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {results.map((r, i) => (
                  <Tag
                    key={i}
                    onClick={() => handleSelect(r)}
                    style={{
                      cursor: "pointer",
                      borderRadius: 8,
                      padding: "4px 16px",
                      fontSize: 16,
                      fontWeight: 600,
                      backgroundColor: "#E8A87C",
                      color: "#fff",
                      border: "none",
                    }}
                  >
                    {r}
                  </Tag>
                ))}
                <Text
                  style={{
                    fontSize: 12,
                    color: "#8B7355",
                    width: "100%",
                    marginTop: 4,
                  }}
                >
                  点击结果填入称呼
                </Text>
              </div>
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <Text style={{ fontSize: 13, color: "#8B7355" }}>
                    未计算出结果，请调整关系链
                  </Text>
                }
              />
            )
          ) : (
            <Text style={{ fontSize: 13, color: "#A89880" }}>
              输入关系链后点击"计算"，如：爸爸的哥哥的儿子
            </Text>
          )}
        </div>
      </div>
    </Modal>
  );
}
