# Log Analysis System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     INPUT SOURCES                                │
├─────────────────────────────────────────────────────────────────┤
│  • Malformed JSON Files                                          │
│  • Edge Function Logs                                            │
│  • Supabase sync_logs_detailed                                   │
│  • Manual Input (CLI)                                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOG VALIDATOR                                 │
│              (src/utils/logValidator.ts)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐        │
│  │ 1. Try parse raw JSON                                │        │
│  │    ├─ Success → Validate                            │        │
│  │    └─ Fail → Repair                                 │        │
│  │                                                       │        │
│  │ 2. Repair JSON                                       │        │
│  │    ├─ Fix missing braces {}                         │        │
│  │    ├─ Fix missing commas                            │        │
│  │    ├─ Extract individual objects                    │        │
│  │    └─ Remove garbage                                │        │
│  │                                                       │        │
│  │ 3. Normalize Fields                                 │        │
│  │    ├─ "carimbo de data/hora" → "timestamp"         │        │
│  │    ├─ Log levels: ERRO → ERROR                     │        │
│  │    └─ Timestamps: microseconds → ISO               │        │
│  │                                                       │        │
│  │ 4. Validate with Zod                                │        │
│  │    ├─ Schema validation                             │        │
│  │    ├─ Type checking                                 │        │
│  │    └─ Required fields                               │        │
│  └─────────────────────────────────────────────────────┘        │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LOG ANALYZER                                  │
│              (src/utils/logAnalyzer.ts)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐        │
│  │ 1. Summary Statistics                                │        │
│  │    ├─ Count by level (ERROR, WARN, INFO)           │        │
│  │    ├─ Time range analysis                           │        │
│  │    └─ Total log count                               │        │
│  │                                                       │        │
│  │ 2. Critical Issue Detection                         │        │
│  │    ├─ RLS Policy Violations                         │        │
│  │    │  └─ "política de segurança" pattern           │        │
│  │    ├─ Shutdown Events                               │        │
│  │    │  └─ "desligamento" pattern                    │        │
│  │    └─ Unknown Errors                                │        │
│  │       └─ Generic ERROR level logs                  │        │
│  │                                                       │        │
│  │ 3. Pattern Recognition                              │        │
│  │    ├─ Group errors by message                       │        │
│  │    ├─ Identify recurring patterns                   │        │
│  │    ├─ Calculate trend (↗ ↘ →)                      │        │
│  │    └─ Frequency analysis                            │        │
│  │                                                       │        │
│  │ 4. Performance Analysis                             │        │
│  │    ├─ Error rate calculation                        │        │
│  │    ├─ Categorize severity                           │        │
│  │    └─ Metrics collection                            │        │
│  │                                                       │        │
│  │ 5. Health Score Calculation                         │        │
│  │    Base: 100                                         │        │
│  │    - Critical issues × 30                           │        │
│  │    - Warnings × 10                                  │        │
│  │    - Recurring patterns × 5                         │        │
│  │    - Error rate (max 40)                            │        │
│  │    Final: max(0, min(100, score))                  │        │
│  │                                                       │        │
│  │ 6. Recommendation Engine                            │        │
│  │    ├─ RLS fix → SQL statements                     │        │
│  │    ├─ Error patterns → Investigation tips          │        │
│  │    └─ Health improvement → Action items            │        │
│  └─────────────────────────────────────────────────────┘        │
└────────────────┬────────────────┬───────────────────────────────┘
                 │                │
        ┌────────▼─────┐  ┌──────▼──────┐
        │              │  │              │
        ▼              ▼  ▼              ▼
┌──────────────┐ ┌─────────────────────────┐
│              │ │   NOTIFICATION SYSTEM    │
│   REPORT     │ │  (src/utils/logNotifier.ts) │
│  GENERATOR   │ ├─────────────────────────┤
│              │ │ ┌───────────────────┐   │
│              │ │ │ 1. Filter Logs    │   │
│              │ │ │    ├─ By level    │   │
│              │ │ │    ├─ By message  │   │
│              │ │ │    └─ By exclude  │   │
│              │ │ │                    │   │
│              │ │ │ 2. Rate Limiting  │   │
│              │ │ │    ├─ Cooldown    │   │
│              │ │ │    └─ Hourly max  │   │
│              │ │ │                    │   │
│              │ │ │ 3. Channels       │   │
│              │ │ │    ├─ Console     │   │
│              │ │ │    ├─ Toast       │   │
│              │ │ │    ├─ Webhook     │   │
│              │ │ │    └─ Email       │   │
│              │ │ └───────────────────┘   │
│              │ └─────────────────────────┘
│              │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REPORT GENERATOR                              │
│              (src/utils/logReporter.ts)                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐        │
│  │ Format Selection                                     │        │
│  │    ├─ JSON (machine-readable)                       │        │
│  │    ├─ Markdown (documentation)                      │        │
│  │    ├─ HTML (interactive report)                     │        │
│  │    └─ Text (console/logs)                           │        │
│  │                                                       │        │
│  │ Report Components                                    │        │
│  │    ├─ Header (timestamp, time range)                │        │
│  │    ├─ Health Score (color-coded)                    │        │
│  │    ├─ Summary Table (metrics)                       │        │
│  │    ├─ Critical Issues (with fixes)                  │        │
│  │    ├─ Warnings                                       │        │
│  │    ├─ Recurring Patterns                            │        │
│  │    ├─ Performance Issues                            │        │
│  │    ├─ Recommendations                               │        │
│  │    ├─ Metrics (optional)                            │        │
│  │    └─ Raw Logs (optional)                           │        │
│  │                                                       │        │
│  │ Export Options                                       │        │
│  │    ├─ Download as file                              │        │
│  │    ├─ Copy to clipboard                             │        │
│  │    └─ Send via API                                  │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         OUTPUTS                                  │
├─────────────────────────────────────────────────────────────────┤
│  • Console Output (colored, formatted)                           │
│  • Markdown Reports (for docs)                                   │
│  • HTML Reports (interactive, styled)                            │
│  • JSON Data (for APIs, integrations)                            │
│  • Notifications (toast, webhook, email)                         │
│  • File Downloads (.md, .html, .json, .txt)                      │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Example

### Input: Malformed JSON
```json
{
  "event_message": "nova linha viola a política de segurança...",
  "id": "642d80d6...",
  "log_level": "ERRO",
{
  "event_message": "desligamento",
  "carimbo de data/hora": 1760977744435000
}
```

### Step 1: Validator Output
```typescript
{
  isValid: true,
  logs: [
    {
      event_message: "nova linha viola a política de segurança...",
      id: "642d80d6...",
      log_level: "ERRO",
      timestamp: 1760977552196000,
      log_level_normalized: "ERROR"
    },
    {
      event_message: "desligamento",
      timestamp: 1760977744435000,
      log_level_normalized: "LOG"
    }
  ],
  warnings: ["Initial JSON parsing failed, attempting repair..."],
  errors: []
}
```

### Step 2: Analyzer Output
```typescript
{
  summary: {
    totalLogs: 2,
    errorCount: 1,
    warnCount: 0,
    infoCount: 1
  },
  issues: {
    critical: [
      {
        id: "rls-violation",
        type: "RLS_POLICY_VIOLATION",
        message: "Row-Level Security policy violation...",
        count: 1,
        recommendation: "CREATE POLICY \"service_role_all\"..."
      }
    ]
  },
  healthScore: 26.67
}
```

### Step 3: Notification Output
```typescript
[
  {
    id: "rls-violation-1760977...",
    severity: "critical",
    title: "RLS Policy Violation Detected",
    message: "1 log(s) failed due to RLS violations...",
    channel: "console"
  },
  {
    id: "health-critical-1760977...",
    severity: "critical",
    title: "System Health Critical",
    message: "Health score: 26.67/100",
    channel: "toast"
  }
]
```

### Step 4: Report Output (Markdown)
````markdown
# Sync Log Analysis Report

**Generated:** 10/20/2025, 4:45:32 PM

## 🔴 Health Score: 26/100

## 📊 Summary

| Metric | Count |
|--------|-------|
| Total Logs | 2 |
| ❌ Errors | 1 |

## 🔴 Critical Issues

### 1. RLS_POLICY_VIOLATION

**Message:** Row-Level Security policy violation...

**Recommendation:**
```sql
CREATE POLICY "service_role_all" 
ON sync_logs_detailed 
FOR ALL TO service_role USING (true);
```
````

## Component Interactions

```
┌─────────────┐
│   CLI Tool  │
│ analyzeLogs │
└──────┬──────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌─────────────┐   ┌─────────────┐
│  Validator  │   │   Analyzer  │
└──────┬──────┘   └──────┬──────┘
       │                 │
       │                 ├─────────────────┐
       │                 │                 │
       ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Notifier  │   │   Reporter  │   │  Dashboard  │
└─────────────┘   └─────────────┘   └─────────────┘
```

## Integration Points

### 1. Sync Repository
```typescript
src/repositories/syncLogsRepo.ts
  ↓ uses
src/utils/logAnalyzer.ts
  ↓ triggers
src/utils/logNotifier.ts
```

### 2. Dashboard Component
```typescript
src/components/sync/LogAnalysisDashboard.tsx
  ↓ fetches
src/repositories/syncLogsRepo.ts
  ↓ analyzes
src/utils/logAnalyzer.ts
  ↓ displays
Health Score, Issues, Recommendations
```

### 3. Edge Functions
```typescript
supabase/functions/diagnose-tabulador-sync/index.ts
  ↓ generates logs
Malformed JSON
  ↓ validates
src/utils/logValidator.ts
  ↓ normalizes
Valid JSON for storage
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend                            │
├─────────────────────────────────────────────────────────┤
│  • React 18 (UI components)                              │
│  • TypeScript 5.8 (type safety)                          │
│  • Zod 3.25 (schema validation)                          │
│  • date-fns 3.6 (date handling)                          │
│  • Sonner (toast notifications)                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      Backend                             │
├─────────────────────────────────────────────────────────┤
│  • Node.js (CLI tool)                                    │
│  • tsx (TypeScript execution)                            │
│  • Supabase Edge Functions (Deno runtime)                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                     Database                             │
├─────────────────────────────────────────────────────────┤
│  • Supabase PostgreSQL                                   │
│  • sync_logs_detailed table                              │
│  • RLS policies                                          │
└─────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Input Validation                        │
├─────────────────────────────────────────────────────────┤
│  1. Zod Schema Validation                                │
│     ├─ Type checking                                     │
│     ├─ Required fields                                   │
│     └─ Format validation                                 │
│                                                           │
│  2. Sanitization                                         │
│     ├─ Remove dangerous characters                       │
│     ├─ Limit string lengths                              │
│     └─ Escape HTML in reports                            │
│                                                           │
│  3. Error Handling                                       │
│     ├─ Try-catch blocks                                  │
│     ├─ Graceful degradation                              │
│     └─ User-friendly error messages                      │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  Rate Limiting                           │
├─────────────────────────────────────────────────────────┤
│  • Notification cooldown (5 min default)                 │
│  • Hourly limits (10 per hour default)                   │
│  • Prevents DoS on notification channels                 │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  Authentication                          │
├─────────────────────────────────────────────────────────┤
│  • Webhook authentication (future)                       │
│  • Service role key validation                           │
│  • RLS policy enforcement                                │
└─────────────────────────────────────────────────────────┘
```

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| JSON Repair | O(n) | Linear scan of input |
| Validation | O(n) | Per log entry |
| Analysis | O(n) | Single pass through logs |
| Pattern Detection | O(n log n) | Grouping and sorting |
| Report Generation | O(n) | Template rendering |

### Space Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Log Storage | O(n) | In-memory array |
| Pattern Groups | O(n) | Map of patterns |
| Notification History | O(1) | Fixed size map |
| Report Buffer | O(n) | Output string |

### Scalability Limits

| Metric | Limit | Recommendation |
|--------|-------|----------------|
| Max Logs per Analysis | 1,000 | Batch processing |
| Max JSON Size | 10 MB | Stream processing |
| Max Report Size | 50 MB | Pagination |
| Max Notifications/Hour | 100 | Rate limiting |

## Error Handling Strategy

```
┌─────────────────────────────────────────────────────────┐
│                  Error Hierarchy                         │
├─────────────────────────────────────────────────────────┤
│  Level 1: Validation Errors                              │
│    ├─ JSON parsing failures → Repair attempt            │
│    ├─ Schema validation errors → Skip log               │
│    └─ Type conversion errors → Default values           │
│                                                           │
│  Level 2: Analysis Errors                               │
│    ├─ Empty log set → Warning message                   │
│    ├─ Invalid timestamps → Use current time             │
│    └─ Missing fields → Graceful degradation             │
│                                                           │
│  Level 3: Notification Errors                           │
│    ├─ Channel unavailable → Try next channel            │
│    ├─ Rate limit exceeded → Queue for later             │
│    └─ Network errors → Retry with backoff               │
│                                                           │
│  Level 4: Report Errors                                 │
│    ├─ Template errors → Use plain text fallback         │
│    ├─ Export errors → Return in-memory content          │
│    └─ Format errors → Use JSON fallback                 │
└─────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Development                             │
├─────────────────────────────────────────────────────────┤
│  • Local TypeScript development                          │
│  • Hot reload with Vite                                  │
│  • CLI testing with tsx                                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Build Process                          │
├─────────────────────────────────────────────────────────┤
│  • TypeScript compilation                                │
│  • Type checking                                         │
│  • Security scanning (CodeQL)                            │
│  • Bundle optimization                                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Production                             │
├─────────────────────────────────────────────────────────┤
│  • Static assets on CDN                                  │
│  • Edge Functions on Supabase                            │
│  • CLI tool via npm scripts                              │
│  • Integrated in React dashboard                         │
└─────────────────────────────────────────────────────────┘
```

## Monitoring & Observability

```
┌─────────────────────────────────────────────────────────┐
│                      Metrics                             │
├─────────────────────────────────────────────────────────┤
│  • Health score over time                                │
│  • Error rate trends                                     │
│  • Notification frequency                                │
│  • Report generation time                                │
│  • JSON repair success rate                              │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      Logging                             │
├─────────────────────────────────────────────────────────┤
│  • Console logs (development)                            │
│  • Supabase logs (production)                            │
│  • Notification history                                  │
│  • Error stack traces                                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      Alerts                              │
├─────────────────────────────────────────────────────────┤
│  • Critical issues (immediate)                           │
│  • Health score drops (< 50)                             │
│  • High error rates (> 50%)                              │
│  • RLS violations (immediate)                            │
└─────────────────────────────────────────────────────────┘
```

## Future Architecture Enhancements

### Phase 1: Real-time Monitoring
```
Edge Functions → WebSocket → React Dashboard
                    ↓
            Live Health Score
            Live Error Stream
            Live Notifications
```

### Phase 2: Machine Learning
```
Historical Logs → ML Model → Pattern Prediction
                      ↓
              Anomaly Detection
              Predictive Alerts
              Auto-remediation
```

### Phase 3: Distributed Architecture
```
Multiple Sources → Log Aggregator → Central Analysis
                         ↓
                  Distributed Reports
                  Multi-tenant Support
                  SLA Monitoring
```

## Conclusion

This architecture provides a robust, scalable, and maintainable solution for log analysis in the Gestão Scouter system. The modular design allows for easy extension and integration with existing components while maintaining security and performance standards.
