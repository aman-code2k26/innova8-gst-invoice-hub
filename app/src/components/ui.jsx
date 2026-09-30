export const Empty = ({ title, sub }) => (
  <div className="empty">
    <b>{title}</b>
    {sub}
  </div>
);

export const StatusPill = ({ inv }) => <span className={'st st-' + I8.statusOf(inv)}>{I8.statusOf(inv)}</span>;

export const cardTitle = (title, tag) => (
  <>
    {title} {tag && <span className="tag">{tag}</span>}
  </>
);
