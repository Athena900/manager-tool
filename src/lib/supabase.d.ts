// TypeScript型定義ファイル
export declare const salesAPI: {
  fetchAll(storeId?: string | null): Promise<any[]>
  create(data: any): Promise<any>
  update(id: string, data: any): Promise<any>
  delete(id: string): Promise<void>
  subscribeToChanges(callback: (payload: any) => void): any
  unsubscribeAll(): void
}

export declare const rlsDiagnostic: {
  runComprehensiveDiagnostic(): Promise<any>
  checkPolicies(): Promise<any>
}

export declare const supabase: any