export default function AdminLoading() {
  return (
    <div style={styles.container}>
      <div style={styles.skeleton}>
        <div style={styles.header}>
          <div style={{ ...styles.bar, width: 200, height: 32 }} />
          <div style={{ ...styles.bar, width: 150, height: 16, marginTop: 8 }} />
        </div>
        <div style={styles.grid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={styles.card}>
              <div style={{ ...styles.bar, width: 60, height: 40 }} />
              <div style={{ ...styles.bar, width: 100, height: 14, marginTop: 8 }} />
            </div>
          ))}
        </div>
        <div style={styles.table}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={styles.row}>
              <div style={{ ...styles.bar, flex: 2, height: 16 }} />
              <div style={{ ...styles.bar, width: 80, height: 16 }} />
              <div style={{ ...styles.bar, width: 100, height: 16 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    padding: 0,
  },
  skeleton: {
    animation: 'pulse 2s ease-in-out infinite',
  },
  header: {
    marginBottom: 32,
  },
  bar: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 20,
    marginBottom: 32,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  table: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  row: {
    display: 'flex',
    gap: 16,
    padding: '12px 0',
    borderBottom: '1px solid #F3F4F6',
  },
};
