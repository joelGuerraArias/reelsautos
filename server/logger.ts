import fs from 'fs';
import path from 'path';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  details?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxInMemoryLogs = 1000;
  private logFile: string;
  private logDir: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, 'app.log');
    this.ensureLogDir();
    this.loadExistingLogs();
  }

  private ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private loadExistingLogs() {
    try {
      if (fs.existsSync(this.logFile)) {
        const content = fs.readFileSync(this.logFile, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        // Cargar últimos 500 logs del archivo
        const recentLines = lines.slice(-500);
        for (const line of recentLines) {
          try {
            const log = JSON.parse(line);
            this.logs.push(log);
          } catch (e) {
            // Ignorar líneas que no son JSON válido
          }
        }
      }
    } catch (error) {
      console.error('Error loading existing logs:', error);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatForConsole(entry: LogEntry): string {
    const icons: Record<LogLevel, string> = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🔍',
      success: '✅'
    };
    const icon = icons[entry.level] || '📝';
    return `${icon} [${entry.timestamp}] [${entry.category}] ${entry.message}`;
  }

  private writeToFile(entry: LogEntry) {
    try {
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(this.logFile, line);
    } catch (error) {
      console.error('Error writing log to file:', error);
    }
  }

  log(level: LogLevel, category: string, message: string, details?: any) {
    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details: details ? (typeof details === 'object' ? details : { value: details }) : undefined
    };

    // Agregar a memoria
    this.logs.push(entry);
    
    // Mantener límite de logs en memoria
    if (this.logs.length > this.maxInMemoryLogs) {
      this.logs = this.logs.slice(-this.maxInMemoryLogs);
    }

    // Escribir a archivo
    this.writeToFile(entry);

    // Mostrar en consola
    const consoleMsg = this.formatForConsole(entry);
    switch (level) {
      case 'error':
        console.error(consoleMsg, details || '');
        break;
      case 'warn':
        console.warn(consoleMsg, details || '');
        break;
      case 'debug':
        console.debug(consoleMsg, details || '');
        break;
      default:
        console.log(consoleMsg, details ? JSON.stringify(details).substring(0, 100) : '');
    }

    return entry;
  }

  info(category: string, message: string, details?: any) {
    return this.log('info', category, message, details);
  }

  warn(category: string, message: string, details?: any) {
    return this.log('warn', category, message, details);
  }

  error(category: string, message: string, details?: any) {
    return this.log('error', category, message, details);
  }

  debug(category: string, message: string, details?: any) {
    return this.log('debug', category, message, details);
  }

  success(category: string, message: string, details?: any) {
    return this.log('success', category, message, details);
  }

  // Obtener logs con filtros
  getLogs(options: {
    level?: LogLevel;
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  } = {}): { logs: LogEntry[]; total: number } {
    let filtered = [...this.logs];

    // Filtrar por nivel
    if (options.level) {
      filtered = filtered.filter(log => log.level === options.level);
    }

    // Filtrar por categoría
    if (options.category) {
      filtered = filtered.filter(log => 
        log.category.toLowerCase().includes(options.category!.toLowerCase())
      );
    }

    // Filtrar por búsqueda de texto
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        log.category.toLowerCase().includes(searchLower) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower))
      );
    }

    // Filtrar por fecha
    if (options.startDate) {
      filtered = filtered.filter(log => log.timestamp >= options.startDate!);
    }
    if (options.endDate) {
      filtered = filtered.filter(log => log.timestamp <= options.endDate!);
    }

    const total = filtered.length;

    // Ordenar por fecha descendente (más recientes primero)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Aplicar paginación
    const offset = options.offset || 0;
    const limit = options.limit || 100;
    filtered = filtered.slice(offset, offset + limit);

    return { logs: filtered, total };
  }

  // Obtener estadísticas
  getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<string, number>;
    recentErrors: LogEntry[];
  } {
    const byLevel: Record<LogLevel, number> = {
      info: 0,
      warn: 0,
      error: 0,
      debug: 0,
      success: 0
    };

    const byCategory: Record<string, number> = {};

    for (const log of this.logs) {
      byLevel[log.level]++;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    }

    // Últimos 10 errores
    const recentErrors = this.logs
      .filter(log => log.level === 'error')
      .slice(-10)
      .reverse();

    return {
      total: this.logs.length,
      byLevel,
      byCategory,
      recentErrors
    };
  }

  // Limpiar logs antiguos
  clearOldLogs(daysToKeep: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffStr = cutoffDate.toISOString();

    this.logs = this.logs.filter(log => log.timestamp >= cutoffStr);
    
    // Reescribir archivo
    try {
      const content = this.logs.map(log => JSON.stringify(log)).join('\n') + '\n';
      fs.writeFileSync(this.logFile, content);
    } catch (error) {
      console.error('Error clearing old logs:', error);
    }

    return { deleted: this.logs.length, remaining: this.logs.length };
  }

  // Obtener categorías únicas
  getCategories(): string[] {
    const categories = new Set<string>();
    for (const log of this.logs) {
      categories.add(log.category);
    }
    return Array.from(categories).sort();
  }
}

// Singleton
export const logger = new Logger();

