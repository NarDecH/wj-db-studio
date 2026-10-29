/**
 * WJ DB Studio — SQL tokenizer/highlighter (pure, testable).
 * (c) 2026 Weeradech Jessadarom — MIT
 */
/* ================= syntax highlighting ================= */
const KEYWORDS = `SELECT FROM WHERE AND OR NOT NULL IS IN LIKE BETWEEN ORDER GROUP BY HAVING LIMIT OFFSET AS ON JOIN
INNER LEFT RIGHT FULL OUTER CROSS UNION ALL DISTINCT INSERT INTO VALUES UPDATE SET DELETE CREATE ALTER DROP TABLE DATABASE
SCHEMA VIEW INDEX PRIMARY KEY FOREIGN REFERENCES CONSTRAINT UNIQUE AUTO_INCREMENT ENGINE CHARSET COLLATE DEFAULT COMMENT
IF EXISTS TRUNCATE RENAME TO BEGIN COMMIT ROLLBACK START TRANSACTION LOCK UNLOCK SHOW DESCRIBE EXPLAIN USE GRANT REVOKE
CASCADE RESTRICT PROCEDURE FUNCTION TRIGGER EVENT CALL DELIMITER CASE WHEN THEN ELSE END WHILE FOR RETURN LEAVE ITERATE
STORED TEMPORARY MEMORY INNODB MYISAM ARIA ROW_FORMAT UNSIGNED ZEROFILL BINARY GENERATED VIRTUAL STORED ALWAYS ASC DESC
CONCURRENT LOW_PRIORITY HIGH_PRIORITY DELAYED DUPLICATE PARTITION VALUES SUBPARTITION ALGORITHM CHARACTER SET INTERVAL
CURRENT_TIMESTAMP LOCALTIME LOCALTIMESTAMP NOW SQL_NO_CACHE SQL_CACHE STRAIGHT_JOIN NATURAL USING FORCE IGNORE
SEPARATOR DETERMINISTIC READS MODIFIES SQL DATA SECURITY DEFINER INVOKER COMMENT BEFORE AFTER EACH ROW STATEMENT
OUT INOUT HANDLER FOUND EXIT UNDO ITERATE REPEAT LOOP RETURN TRUE FALSE UNKNOWN DIV MOD XOR ISolation LEVEL
READ WRITE COMMITTED UNCOMMITTED REPEATABLE SERIALIZABLE GET DIAGNOSTICS SIGNAL RESIGNAL CONDITION SQLEXCEPTION SQLWARNING
PREPARE EXECUTE DEALLOCATE PREPARE FROM CHANGE COLUMN ADD MODIFY AFTER FIRST`.split(/\s+/).filter(Boolean);

const FUNCTIONS = `COUNT SUM AVG MIN MAX CONCAT SUBSTRING SUBSTR LENGTH CHAR_LENGTH UPPER LOWER TRIM REPLACE ROUND CEIL FLOOR
ABS MOD POW SQRT EXP LN LOG RAND SIGN DATE TIME DATETIME TIMESTAMP YEAR MONTH DAY HOUR MINUTE SECOND DATE_FORMAT
DATE_ADD DATE_SUB DATEDIFF TIMEDIFF UNIX_TIMESTAMP FROM_UNIXTIME STR_TO_DATE IF IFNULL NULLIF COALESCE CASE CAST CONVERT
GROUP_CONCAT JSON_OBJECT JSON_ARRAY JSON_EXTRACT JSON_UNQUOTE JSON_VALID MD5 SHA1 SHA2 AES_ENCRYPT AES_DECRYPT UUID
LAST_INSERT_ID ROW_COUNT FOUND_ROWS NOW CURDATE CURTIME SYSDATE VERSION DATABASE USER CONNECTION_ID BENCHMARK SLEEP
INET_ATON INET_NTOA FORMAT FIELD ELT INSERT LOCATE POSITION INSTR LPAD RPAD LEFT RIGHT MID REPEAT SPACE STRCMP
CONV BIN OCT HEX UNHEX COMPRESS UNCOMPRESS CRC32 ISNULL EXISTS`.split(/\s+/).filter(Boolean);

const TYPES = `INT INTEGER TINYINT SMALLINT MEDIUMINT BIGINT FLOAT DOUBLE DECIMAL NUMERIC BIT BOOL BOOLEAN DATE DATETIME
TIMESTAMP TIME YEAR CHAR VARCHAR TINYTEXT TEXT MEDIUMTEXT LONGTEXT BINARY VARBINARY BLOB TINYBLOB MEDIUMBLOB LONGBLOB
ENUM SET JSON GEOMETRY POINT LINESTRING POLYGON MULTIPOINT`.split(/\s+/).filter(Boolean);

const KW_RE = new RegExp(`^(${[...KEYWORDS, ...TYPES].join('|')})$`, 'i');
const FN_RE = new RegExp(`^(${FUNCTIONS.join('|')})(\\s*\\()?$`, 'i');

/** Tokenize SQL text to colored HTML (escape-safe). */
export function highlightSQL(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  const push = (cls, text) => { out += cls ? `<span class="${cls}">${text}</span>` : text; };
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

  while (i < n) {
    const ch = src[i];
    // line comments
    if ((ch === '-' && src[i + 1] === '-') || ch === '#') {
      let j = i;
      while (j < n && src[j] !== '\n') j++;
      push('tk-com', esc(src.slice(i, j))); i = j; continue;
    }
    // block comments
    if (ch === '/' && src[i + 1] === '*') {
      let j = src.indexOf('*/', i + 2);
      j = j === -1 ? n : j + 2;
      push('tk-com', esc(src.slice(i, j))); i = j; continue;
    }
    // strings
    if (ch === "'" || ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src[j] === ch) { if (src[j + 1] === ch) { j += 2; continue; } j++; break; }
        j++;
      }
      push('tk-str', esc(src.slice(i, j))); i = j; continue;
    }
    // identifiers / backticks
    if (ch === '`') {
      let j = src.indexOf('`', i + 1);
      j = j === -1 ? n : j + 1;
      push('tk-bt', esc(src.slice(i, j))); i = j; continue;
    }
    // numbers
    if (/\d/.test(ch) || (ch === '.' && /\d/.test(src[i + 1] || ''))) {
      let j = i;
      while (j < n && /[\d.eE+\-xXa-fA-F_]/.test(src[j])) {
        // stop +- unless part of exponent/hex
        if ((src[j] === '+' || src[j] === '-') && !/[eE]/.test(src[j - 1])) break;
        j++;
      }
      push('tk-num', esc(src.slice(i, j))); i = j; continue;
    }
    // words
    if (/[A-Za-z_@\$]/.test(ch)) {
      let j = i;
      while (j < n && /[\w\.\$]/.test(src[j])) j++;
      const word = src.slice(i, j);
      if (KW_RE.test(word)) push('tk-kw', esc(word));
      else if (FN_RE.test(word)) push('tk-fn', esc(word));
      else push('tk-id', esc(word));
      i = j; continue;
    }
    // operators & punctuation
    if (/[=<>!+\-*/%(),;.&|~^]/.test(ch)) {
      let j = i;
      while (j < n && /[=<>!+\-*/%(),;.&|~^]/.test(src[j])) j++;
      push('tk-op', esc(src.slice(i, j))); i = j; continue;
    }
    out += esc(ch); i++;
  }
  return out + '\n';
}


