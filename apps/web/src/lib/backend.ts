export type DbType = 'sqlite' | 'postgres' | 'mysql';

export interface DataSource {
  id: string;
  name: string;
  type: DbType;
  host: string;
  port: number;
  database: string;
  username: string;
  file_path: string;
  read_only: boolean;
  created_at: string;
  updated_at: string;
}

export interface ConnectionParams {
  id?: string;
  name: string;
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  filePath: string;
  readOnly: boolean;
}

export interface QueryResult {
  columns: string[];
  rows: string[][];
  rowsAffected: number;
  durationMs: number;
}

export interface TreeNode {
  name: string;
  kind: 'database' | 'schema' | 'table' | 'view';
  children?: TreeNode[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  defaultValue: string;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface CSVImportResult {
  rowsImported: number;
  error: string;
}

export interface TableRef {
  schema: string;
  name: string;
}

export interface ColumnDiff {
  name: string;
  kind: 'added' | 'removed' | 'changed';
  before?: ColumnInfo;
  after?: ColumnInfo;
}

export interface IndexDiff {
  name: string;
  kind: 'added' | 'removed' | 'changed';
  before?: IndexInfo;
  after?: IndexInfo;
}

export interface TableDiff {
  schema: string;
  name: string;
  columnDiffs: ColumnDiff[];
  indexDiffs: IndexDiff[];
}

export interface SchemaDiff {
  sourceId: string;
  targetId: string;
  tablesOnlyInA: TableRef[];
  tablesOnlyInB: TableRef[];
  tablesChanged: TableDiff[];
}

export interface RowDiff {
  kind: 'added' | 'removed' | 'changed';
  key: string;
  before?: Record<string, string>;
  after?: Record<string, string>;
}

export interface DataDiff {
  sourceId: string;
  targetId: string;
  schema: string;
  table: string;
  keyColumn: string;
  columns: string[];
  onlyInA: RowDiff[];
  onlyInB: RowDiff[];
  changed: RowDiff[];
  truncated: boolean;
}

export interface ExplainNode {
  op: string;
  details: string;
  children?: ExplainNode[];
}

export interface ExplainResult {
  nodes: ExplainNode[];
  raw: string;
}

export interface GraphTable {
  schema: string;
  name: string;
  columns: ColumnInfo[];
}

export interface GraphFKEnd {
  schema: string;
  table: string;
  columns: string[];
}

export interface GraphFK {
  name: string;
  from: GraphFKEnd;
  to: GraphFKEnd;
}

export interface SchemaGraph {
  tables: GraphTable[];
  foreignKeys: GraphFK[];
}

export interface QueryHistory {
  id: number;
  connectionId: string;
  sql: string;
  durationMs: number;
  rowCount: number;
  error: string;
  createdAt: string;
}

export interface AIConfig {
  provider: string; // 'openai' | 'ollama' | 'custom'
  baseUrl: string;
  model: string;
  apiKey: string;
}

export interface AIActionRequest {
  connectionId: string;
  action: 'generate' | 'explain' | 'optimize' | 'repair';
  sql: string;
  errorMsg: string;
  userPrompt: string;
}

export interface AIActionResult {
  content: string;
}

export interface AIAuditEvent {
  id: number;
  action: string;
  provider: string;
  model: string;
  inputLen: number;
  outputLen: number;
  durationMs: number;
  error: string;
  createdAt: string;
}

export interface SQLAuditEvent {
  id: number;
  connectionId: string;
  connectionName: string;
  sql: string;
  durationMs: number;
  rowsAffected: number;
  error: string;
  riskLevel: string;
  createdAt: string;
}

export interface SQLAuditFilter {
  connectionId: string;
  errorOnly: boolean;
  limit: number;
}

export interface ConnectionPolicy {
  connectionId: string;
  allowDdl: boolean;
  allowDml: boolean;
  allowExport: boolean;
  updatedAt: string;
}

export interface SQLPolicy {
  id: number;
  pattern: string;
  level: 'warning' | 'danger';
  message: string;
  enabled: boolean;
  createdAt: string;
}

export interface SavedQuery {
  id: string;
  connectionId: string;
  name: string;
  sql: string;
  createdAt: string;
  updatedAt: string;
}

export type RiskLevel = 'none' | 'warning' | 'danger';

export interface RiskAssessment {
  level: RiskLevel;
  message: string;
}

export interface BackupInfo {
  path: string;
  name: string;
  size: number;
  createdAt: string;
}

export interface ArchiveResult {
  sqlDeleted: number;
  aiDeleted: number;
  exportDeleted: number;
}

export interface DriverInfo {
  name: string;
  displayName: string;
  version: string;
  features: string[];
  builtIn: boolean;
  schemas: boolean;
  inUse: boolean;
  disabled: boolean;
}

export interface ProbeResult {
  connected: boolean;
  latencyMs: number;
  features: string[];
  errors: string[];
}

export type ChartType = 'number' | 'bar' | 'line' | 'table';

export interface DashboardWidget {
  id: string;
  title: string;
  connectionId: string;
  sql: string;
  chartType: ChartType;
  position: number;
  createdAt: string;
  updatedAt: string;
}

type WailsApp = {
  ListConnections(): Promise<DataSource[]>;
  CreateConnection(p: ConnectionParams): Promise<DataSource>;
  UpdateConnection(p: ConnectionParams): Promise<DataSource>;
  DeleteConnection(id: string): Promise<void>;
  TestConnection(p: ConnectionParams): Promise<void>;
  ExecuteSQL(id: string, sql: string): Promise<QueryResult>;
  GetObjectTree(id: string): Promise<TreeNode[]>;
  GetQueryHistory(connectionId: string, limit: number): Promise<QueryHistory[]>;
  CancelExecution(connectionId: string): Promise<void>;
  AssessSQL(sql: string): Promise<RiskAssessment>;
  SaveQuery(connectionId: string, name: string, sql: string): Promise<SavedQuery>;
  ListSavedQueries(connectionId: string): Promise<SavedQuery[]>;
  RenameSavedQuery(id: string, name: string): Promise<void>;
  DeleteSavedQuery(id: string): Promise<void>;
  GetAIConfig(): Promise<AIConfig>;
  SetAIConfig(cfg: AIConfig): Promise<void>;
  RunAIAction(req: AIActionRequest): Promise<AIActionResult>;
  GetAIAuditLog(limit: number): Promise<AIAuditEvent[]>;
  GetSchemaGraph(connectionId: string): Promise<SchemaGraph>;
  CompareSchemas(sourceId: string, targetId: string): Promise<SchemaDiff>;
  CompareTableData(sourceId: string, targetId: string, schema: string, table: string, keyColumn: string, limit: number): Promise<DataDiff>;
  CreateBackup(): Promise<BackupInfo>;
  ListBackups(): Promise<BackupInfo[]>;
  DeleteBackup(path: string): Promise<void>;
  ArchiveAudit(beforeDays: number): Promise<ArchiveResult>;
  ListDrivers(): Promise<DriverInfo[]>;
  ProbeConnection(id: string): Promise<ProbeResult>;
  SetDriverEnabled(driverType: string, enabled: boolean): Promise<void>;
  ListDashboardWidgets(): Promise<DashboardWidget[]>;
  CreateDashboardWidget(w: DashboardWidget): Promise<DashboardWidget>;
  UpdateDashboardWidget(w: DashboardWidget): Promise<DashboardWidget>;
  DeleteDashboardWidget(id: string): Promise<void>;
  RunDashboardWidget(id: string): Promise<QueryResult>;
  ExplainSQL(connectionId: string, sql: string): Promise<ExplainResult>;
  GetTableColumns(connectionId: string, schema: string, table: string): Promise<ColumnInfo[]>;
  GetTableIndexes(connectionId: string, schema: string, table: string): Promise<IndexInfo[]>;
  GenerateTableDDL(connectionId: string, schema: string, table: string): Promise<string>;
  GenerateDataDictionary(connectionId: string): Promise<string>;
  BrowseTable(connectionId: string, schema: string, table: string, limit: number): Promise<QueryResult>;
  ImportCSV(connectionId: string, schema: string, table: string, csv: string, hasHeader: boolean): Promise<CSVImportResult>;
  GetSQLAuditLog(f: SQLAuditFilter): Promise<SQLAuditEvent[]>;
  ExportSQLAuditCSV(f: SQLAuditFilter): Promise<string>;
  GetConnectionPolicy(connectionId: string): Promise<ConnectionPolicy>;
  SetConnectionPolicy(p: ConnectionPolicy): Promise<void>;
  ListSQLPolicies(): Promise<SQLPolicy[]>;
  CreateSQLPolicy(pattern: string, level: string, message: string): Promise<SQLPolicy>;
  ToggleSQLPolicy(id: number, enabled: boolean): Promise<void>;
  DeleteSQLPolicy(id: number): Promise<void>;
};

function wailsApp(): WailsApp {
  return (window as unknown as { go: { main: { App: WailsApp } } }).go.main.App;
}

export function isDesktop(): boolean {
  try {
    return typeof (window as unknown as { go?: unknown }).go !== 'undefined';
  } catch {
    return false;
  }
}

export const backend = {
  listConnections: () => wailsApp().ListConnections(),
  createConnection: (p: ConnectionParams) => wailsApp().CreateConnection(p),
  updateConnection: (p: ConnectionParams) => wailsApp().UpdateConnection(p),
  deleteConnection: (id: string) => wailsApp().DeleteConnection(id),
  testConnection: (p: ConnectionParams) => wailsApp().TestConnection(p),
  executeSQL: (id: string, sql: string) => wailsApp().ExecuteSQL(id, sql),
  getObjectTree: (id: string) => wailsApp().GetObjectTree(id),
  getQueryHistory: (connectionId: string, limit = 50) => wailsApp().GetQueryHistory(connectionId, limit),
  cancelExecution: (connectionId: string) => wailsApp().CancelExecution(connectionId),
  assessSQL: (sql: string) => wailsApp().AssessSQL(sql),
  saveQuery: (connectionId: string, name: string, sql: string) => wailsApp().SaveQuery(connectionId, name, sql),
  listSavedQueries: (connectionId: string) => wailsApp().ListSavedQueries(connectionId),
  renameSavedQuery: (id: string, name: string) => wailsApp().RenameSavedQuery(id, name),
  deleteSavedQuery: (id: string) => wailsApp().DeleteSavedQuery(id),
  getAIConfig: () => wailsApp().GetAIConfig(),
  setAIConfig: (cfg: AIConfig) => wailsApp().SetAIConfig(cfg),
  runAIAction: (req: AIActionRequest) => wailsApp().RunAIAction(req),
  getAIAuditLog: (limit = 50) => wailsApp().GetAIAuditLog(limit),
  getSchemaGraph: (id: string) => wailsApp().GetSchemaGraph(id),
  compareSchemas: (src: string, dst: string) => wailsApp().CompareSchemas(src, dst),
  compareTableData: (src: string, dst: string, schema: string, table: string, keyColumn: string, limit = 200) =>
    wailsApp().CompareTableData(src, dst, schema, table, keyColumn, limit),
  createBackup: () => wailsApp().CreateBackup(),
  listBackups: () => wailsApp().ListBackups(),
  deleteBackup: (path: string) => wailsApp().DeleteBackup(path),
  archiveAudit: (beforeDays: number) => wailsApp().ArchiveAudit(beforeDays),
  listDrivers: () => wailsApp().ListDrivers(),
  probeConnection: (id: string) => wailsApp().ProbeConnection(id),
  setDriverEnabled: (driverType: string, enabled: boolean) => wailsApp().SetDriverEnabled(driverType, enabled),
  listDashboardWidgets: () => wailsApp().ListDashboardWidgets(),
  createDashboardWidget: (w: DashboardWidget) => wailsApp().CreateDashboardWidget(w),
  updateDashboardWidget: (w: DashboardWidget) => wailsApp().UpdateDashboardWidget(w),
  deleteDashboardWidget: (id: string) => wailsApp().DeleteDashboardWidget(id),
  runDashboardWidget: (id: string) => wailsApp().RunDashboardWidget(id),
  explainSQL: (id: string, sql: string) => wailsApp().ExplainSQL(id, sql),
  getTableColumns: (id: string, schema: string, table: string) => wailsApp().GetTableColumns(id, schema, table),
  getTableIndexes: (id: string, schema: string, table: string) => wailsApp().GetTableIndexes(id, schema, table),
  generateTableDDL: (id: string, schema: string, table: string) => wailsApp().GenerateTableDDL(id, schema, table),
  generateDataDictionary: (id: string) => wailsApp().GenerateDataDictionary(id),
  browseTable: (id: string, schema: string, table: string, limit = 100) => wailsApp().BrowseTable(id, schema, table, limit),
  importCSV: (id: string, schema: string, table: string, csv: string, hasHeader: boolean) => wailsApp().ImportCSV(id, schema, table, csv, hasHeader),
  getSQLAuditLog: (f: SQLAuditFilter) => wailsApp().GetSQLAuditLog(f),
  exportSQLAuditCSV: (f: SQLAuditFilter) => wailsApp().ExportSQLAuditCSV(f),
  getConnectionPolicy: (id: string) => wailsApp().GetConnectionPolicy(id),
  setConnectionPolicy: (p: ConnectionPolicy) => wailsApp().SetConnectionPolicy(p),
  listSQLPolicies: () => wailsApp().ListSQLPolicies(),
  createSQLPolicy: (pattern: string, level: string, message: string) => wailsApp().CreateSQLPolicy(pattern, level, message),
  toggleSQLPolicy: (id: number, enabled: boolean) => wailsApp().ToggleSQLPolicy(id, enabled),
  deleteSQLPolicy: (id: number) => wailsApp().DeleteSQLPolicy(id),
};
