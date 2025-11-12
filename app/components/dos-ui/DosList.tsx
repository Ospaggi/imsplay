/**
 * DosList - DOS 스타일 리스트 컴포넌트
 */

interface DosListItem {
  key: string;
  content: React.ReactNode;
  onClick?: () => void;
}

interface DosListProps {
  items: DosListItem[];
  selectedKey?: string;
  className?: string;
}

export default function DosList({ items, selectedKey, className = "" }: DosListProps) {
  return (
    <div className={`dos-list ${className}`}>
      <div className="dos-list-scroll">
        {items.map((item) => (
          <div
            key={item.key}
            className={`dos-list-item ${
              selectedKey === item.key ? 'dos-list-item-selected' : ''
            }`}
            onClick={item.onClick}
          >
            {item.content}
          </div>
        ))}
      </div>
    </div>
  );
}
