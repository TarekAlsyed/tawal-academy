const pool = require('./src/config/database');

const checkIndexes = async () => {
  try {
    const result = await pool.query(`
      SELECT
        t.relname as table_name,
        i.relname as index_name,
        a.attname as column_name
      FROM
        pg_class t,
        pg_class i,
        pg_index ix,
        pg_attribute a
      WHERE
        t.oid = ix.indrelid
        AND i.oid = ix.indexrelid
        AND a.attrelid = t.oid
        AND a.attnum = ANY(ix.indkey)
        AND t.relkind = 'r'
        AND t.relname NOT LIKE 'pg_%'
        AND t.relname NOT LIKE 'sql_%'
      ORDER BY
        t.relname,
        i.relname;
    `);

    console.log('📊 Existing Indexes:');
    console.table(result.rows);
  } catch (error) {
    console.error('❌ Error checking indexes:', error.message);
  } finally {
    process.exit(0);
  }
};

checkIndexes();
