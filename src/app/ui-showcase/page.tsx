'use client'

import React, { useState } from 'react'
import { 
  Button, 
  Input, 
  Modal, 
  ModalContent, 
  ModalFooter,
  Alert,
  SuccessAlert,
  ErrorAlert,
  WarningAlert,
  InfoAlert,
  LoadingSpinner,
  PageLoading,
  SectionLoading
} from '@/components/ui'
import { 
  Plus, 
  Settings, 
  Download, 
  Save, 
  Trash2, 
  Edit, 
  Eye,
  ArrowLeft
} from 'lucide-react'
import Link from 'next/link'

export default function UIShowcase() {
  const [modalOpen, setModalOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAsyncAction = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              UIコンポーネントライブラリ
            </h1>
          </div>
          <p className="text-gray-600">
            統一されたデザインシステムとコンポーネントライブラリのデモンストレーション
          </p>
        </div>

        {/* ボタンコンポーネント */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Button コンポーネント</h2>
          
          <div className="space-y-6">
            {/* バリアント */}
            <div>
              <h3 className="text-lg font-medium mb-3">バリアント</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="success">Success</Button>
                <Button variant="warning">Warning</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
            </div>

            {/* サイズ */}
            <div>
              <h3 className="text-lg font-medium mb-3">サイズ</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>

            {/* アイコン付き */}
            <div>
              <h3 className="text-lg font-medium mb-3">アイコン付き</h3>
              <div className="flex flex-wrap gap-3">
                <Button leftIcon={<Plus size={16} />}>追加</Button>
                <Button rightIcon={<Download size={16} />} variant="secondary">
                  ダウンロード
                </Button>
                <Button 
                  leftIcon={<Save size={16} />} 
                  rightIcon={<Settings size={16} />}
                  variant="success"
                >
                  保存して設定
                </Button>
              </div>
            </div>

            {/* ローディング状態 */}
            <div>
              <h3 className="text-lg font-medium mb-3">ローディング状態</h3>
              <div className="flex flex-wrap gap-3">
                <Button loading>Loading...</Button>
                <Button loading variant="secondary">Processing...</Button>
                <Button 
                  loading={loading}
                  onClick={handleAsyncAction}
                  variant="primary"
                >
                  {loading ? 'Loading...' : 'Click me'}
                </Button>
              </div>
            </div>

            {/* 無効状態 */}
            <div>
              <h3 className="text-lg font-medium mb-3">無効状態</h3>
              <div className="flex flex-wrap gap-3">
                <Button disabled>Disabled</Button>
                <Button disabled variant="secondary">Disabled Secondary</Button>
              </div>
            </div>

            {/* フルWidthh */}
            <div>
              <h3 className="text-lg font-medium mb-3">フルWidth</h3>
              <Button fullWidth>Full Width Button</Button>
            </div>
          </div>
        </section>

        {/* アラートコンポーネント */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Alert コンポーネント</h2>
          
          <div className="space-y-4">
            <Alert title="基本アラート">
              これは基本的なアラートメッセージです。
            </Alert>
            
            <SuccessAlert title="成功">
              操作が正常に完了しました。
            </SuccessAlert>
            
            <ErrorAlert title="エラー">
              エラーが発生しました。再度お試しください。
            </ErrorAlert>
            
            <WarningAlert title="警告">
              この操作は元に戻すことができません。
            </WarningAlert>
            
            <InfoAlert title="情報">
              新機能が利用可能になりました。
            </InfoAlert>
          </div>
        </section>

        {/* インプットコンポーネント */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Input コンポーネント</h2>
          
          <div className="space-y-6 max-w-md">
            <Input
              label="基本入力"
              placeholder="テキストを入力してください"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            
            <Input
              label="必須入力"
              placeholder="必須項目"
              required
            />
            
            <Input
              label="エラー状態"
              placeholder="エラーがある入力"
              error="この項目は必須です"
            />
            
            <Input
              label="無効状態"
              placeholder="無効な入力"
              disabled
            />
            
            <Input
              type="password"
              label="パスワード"
              placeholder="パスワードを入力"
            />
            
            <Input
              type="email"
              label="メールアドレス"
              placeholder="example@email.com"
            />
          </div>
        </section>

        {/* ローディングコンポーネント */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Loading コンポーネント</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium mb-3">基本ローディング</h3>
              <div className="flex items-center gap-6">
                <LoadingSpinner size="sm" />
                <LoadingSpinner size="md" />
                <LoadingSpinner size="lg" />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-3">セクションローディング</h3>
              <div className="border border-gray-200 rounded-lg p-4">
                <SectionLoading message="データを読み込み中..." />
              </div>
            </div>
          </div>
        </section>

        {/* モーダルコンポーネント */}
        <section className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Modal コンポーネント</h2>
          
          <Button onClick={() => setModalOpen(true)}>
            モーダルを開く
          </Button>
          
          <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
            <ModalContent>
              <h3 className="text-lg font-semibold mb-4">サンプルモーダル</h3>
              <p className="text-gray-600 mb-4">
                これはモーダルコンポーネントのデモンストレーションです。
                統一されたスタイルとアニメーションを提供します。
              </p>
              <Input
                label="モーダル内の入力"
                placeholder="何か入力してください"
              />
            </ModalContent>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={() => setModalOpen(false)}>
                OK
              </Button>
            </ModalFooter>
          </Modal>
        </section>

        {/* 実装例 */}
        <section className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">実装例</h2>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="text-sm text-gray-800 overflow-x-auto">
{`import { Button, Input, Alert } from '@/components/ui'

// 基本的な使用例
<Button variant="primary" size="lg" loading={isLoading}>
  保存
</Button>

<Input
  label="ユーザー名"
  placeholder="ユーザー名を入力"
  value={username}
  onChange={(e) => setUsername(e.target.value)}
  error={errors.username}
/>

<SuccessAlert title="成功">
  データが正常に保存されました
</SuccessAlert>`}
            </pre>
          </div>
        </section>
      </div>
    </div>
  )
}