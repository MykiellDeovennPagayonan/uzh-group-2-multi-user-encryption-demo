'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { generateKeyPair, getKeyFingerprint, type KeyPair, type EncryptedData } from '@/utils/crypto'
import { MultiUserEncryptionService } from '@/services/multiUserEncryption'

interface User {
  id: string
  name: string
  keyPair: KeyPair
}

interface DecryptionAttempt {
  user: string
  success: boolean
  timestamp: string
}

export default function MultiUserEncryption() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [dataToEncrypt, setDataToEncrypt] = useState('')
  const [encryptedData, setEncryptedData] = useState<EncryptedData | null>(null)
  const [decryptedData, setDecryptedData] = useState('')
  const [selectedDecryptUser, setSelectedDecryptUser] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [decryptionAttempts, setDecryptionAttempts] = useState<DecryptionAttempt[]>([])

  // Create a new user with key pair
  const createUser = (name: string) => {
    try {
      const keyPair = generateKeyPair()
      const user: User = {
        id: Math.random().toString(36).substring(2, 15),
        name,
        keyPair,
      }
      setUsers(prev => [...prev, user])
    } catch (err) {
      setError('Failed to create user: ' + err)
    }
  }

  // Encrypt data with multiple user access
  const encryptData = async () => {
    if (!dataToEncrypt || selectedUsers.length === 0) {
      setError('Please enter data and select at least one user')
      return
    }

    setLoading(true)
    setError('')
    setDecryptionAttempts([])

    try {
      // Build public keys map for selected users
      const userPublicKeys: Record<string, string> = {}

      for (const userId of selectedUsers) {
        const user = users.find(u => u.id === userId)
        if (user) {
          userPublicKeys[userId] = user.keyPair.publicKey
        }
      }

      // Use the service to encrypt
      const encrypted = await MultiUserEncryptionService.encryptForMultipleUsers(
        dataToEncrypt,
        userPublicKeys,
        'demo-user' // Could be current user ID
      )

      setEncryptedData(encrypted)

    } catch (err) {
      setError('Encryption failed: ' + err)
    } finally {
      setLoading(false)
    }
  }

  // Decrypt data with user's private key
  const decryptData = async () => {
    if (!encryptedData || !selectedDecryptUser) {
      setError('Please select encrypted data and a user to decrypt')
      return
    }

    setLoading(true)
    setError('')

    try {
      const user = users.find(u => u.id === selectedDecryptUser)
      if (!user) {
        throw new Error('User not found')
      }

      // Use the service to decrypt
      const result = await MultiUserEncryptionService.decryptForUser(
        encryptedData,
        selectedDecryptUser,
        user.keyPair.privateKey
      )

      if (result.success && result.data) {
        setDecryptedData(result.data)

        // Track successful decryption
        setDecryptionAttempts(prev => [...prev, {
          user: user.name,
          success: true,
          timestamp: new Date().toLocaleTimeString()
        }])
      } else {
        throw new Error(result.error || 'Unknown decryption error')
      }

    } catch (err) {
      const user = users.find(u => u.id === selectedDecryptUser)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'

      // Track failed decryption
      setDecryptionAttempts(prev => [...prev, {
        user: user?.name || 'Unknown',
        success: false,
        timestamp: new Date().toLocaleTimeString()
      }])

      setDecryptedData('')
      setError(`Decryption failed: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Initialize with some demo users
  useEffect(() => {
    createUser('Alice')
    createUser('Bob')
    createUser('Charlie')
  }, [])

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Multi-User Encryption Demo</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Management */}
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Each user has a 2048-bit RSA key pair</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {users.map(user => (
                <div key={user.id} className="p-3 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-sm text-gray-500">({user.id.slice(0, 8)}...)</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Key: {getKeyFingerprint(user.keyPair.publicKey)}...
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Enter user name"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const target = e.target as HTMLInputElement
                      if (target.value.trim()) {
                        createUser(target.value.trim())
                        target.value = ''
                      }
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    const input = document.querySelector('input') as HTMLInputElement
                    if (input?.value.trim()) {
                      createUser(input.value.trim())
                      input.value = ''
                    }
                  }}
                  variant="outline"
                >
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Encryption */}
        <Card>
          <CardHeader>
            <CardTitle>Encrypt Data</CardTitle>
            <CardDescription>Choose which users can decrypt the data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter data to encrypt..."
              value={dataToEncrypt}
              onChange={(e) => setDataToEncrypt(e.target.value)}
              rows={4}
            />

            <div>
              <label className="block text-sm font-medium mb-2">Authorized users:</label>
              <div className="space-y-2">
                {users.map(user => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={user.id}
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(prev => [...prev, user.id])
                        } else {
                          setSelectedUsers(prev => prev.filter(id => id !== user.id))
                        }
                      }}
                    />
                    <label htmlFor={user.id} className="text-sm">{user.name}</label>
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={encryptData}
              disabled={loading || !dataToEncrypt || selectedUsers.length === 0}
              className="w-full"
            >
              {loading ? 'Encrypting...' : 'Encrypt Data'}
            </Button>

            {encryptedData && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm font-medium text-green-800">✓ Data Encrypted Successfully!</p>
                <p className="text-xs text-green-600 mt-1">
                  Authorized users: {encryptedData.authorizedUsers.length} • {encryptedData.metadata?.algorithm}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Decryption */}
        <Card>
          <CardHeader>
            <CardTitle>Decrypt Data</CardTitle>
            <CardDescription>Try to decrypt as different users</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select user to decrypt as:</label>
              <select
                value={selectedDecryptUser}
                onChange={(e) => setSelectedDecryptUser(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a user...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={decryptData}
              disabled={loading || !encryptedData || !selectedDecryptUser}
              className="w-full"
            >
              {loading ? 'Decrypting...' : 'Decrypt Data'}
            </Button>
            {error && (
              <Alert className="mb-4" variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {decryptedData && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm font-medium text-blue-800">✓ Decryption Successful!</p>
                <div className="mt-2 p-3 bg-white border border-blue-100 rounded">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">{decryptedData}</pre>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Encrypted Data Display & Decryption Attempts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Encrypted Data */}
        {encryptedData && (
          <Card>
            <CardHeader>
              <CardTitle>Encrypted Data</CardTitle>
              <CardDescription>Raw encrypted data and metadata</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Ciphertext:</p>
                  <div className="p-2 bg-gray-100 rounded font-mono text-xs break-all">
                    {encryptedData.ciphertext.slice(0, 100)}...
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-700">IV:</p>
                  <div className="p-2 bg-gray-100 rounded font-mono text-xs">
                    {encryptedData.iv}
                  </div>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Encrypted Keys:</p>
                  {Object.entries(encryptedData.encryptedKeys).map(([userId, encKey]) => {
                    const user = users.find(u => u.id === userId)
                    return (
                      <div key={userId} className="ml-2">
                        <p className="text-xs text-gray-600">{user?.name}:</p>
                        <div className="p-2 bg-gray-100 rounded font-mono text-xs break-all">
                          {encKey.slice(0, 50)}...
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div>
                  <p className="font-medium text-gray-700">Authorized Users:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {encryptedData.authorizedUsers.map(userId => {
                      const user = users.find(u => u.id === userId)
                      return (
                        <span key={userId} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                          {user?.name}
                        </span>
                      )
                    })}
                  </div>
                </div>
                {encryptedData.metadata && (
                  <div>
                    <p className="font-medium text-gray-700">Metadata:</p>
                    <div className="ml-2 text-xs text-gray-600">
                      <p>Encrypted: {new Date(encryptedData.metadata.timestamp).toLocaleString()}</p>
                      <p>Algorithm: {encryptedData.metadata.algorithm}</p>
                      {encryptedData.metadata.encryptedBy && (
                        <p>By: {encryptedData.metadata.encryptedBy}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Decryption Attempts */}
        <Card>
          <CardHeader>
            <CardTitle>Decryption Attempts</CardTitle>
            <CardDescription>History of successful and failed decryption attempts</CardDescription>
          </CardHeader>
          <CardContent>
            {decryptionAttempts.length === 0 ? (
              <p className="text-gray-500 text-sm">No decryption attempts yet</p>
            ) : (
              <div className="space-y-2">
                {decryptionAttempts.map((attempt, index) => (
                  <div key={index} className={`p-3 rounded border ${attempt.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-medium ${attempt.success ? 'text-green-800' : 'text-red-800'
                          }`}>
                          {attempt.user}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${attempt.success
                            ? 'bg-green-200 text-green-800'
                            : 'bg-red-200 text-red-800'
                          }`}>
                          {attempt.success ? 'SUCCESS' : 'FAILED'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">{attempt.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Technical Details */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="font-medium text-blue-800">🔐 Encryption Process:</p>
                <ul className="ml-4 space-y-1 text-gray-600">
                  <li>• Generate random 256-bit AES key</li>
                  <li>• Encrypt data with AES-256-CBC</li>
                  <li>• Encrypt AES key with each user&apos;s RSA public key</li>
                  <li>• Store encrypted data + encrypted keys</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-green-800">🔓 Decryption Process:</p>
                <ul className="ml-4 space-y-1 text-gray-600">
                  <li>• Check if user has encrypted key</li>
                  <li>• Decrypt AES key with RSA private key</li>
                  <li>• Use AES key to decrypt actual data</li>
                  <li>• Fail if user wasn&apos;t authorized</li>
                </ul>
              </div>
            </div>
            <div className="border-t pt-3">
              <p className="font-medium text-purple-800">🛡️ Security Features:</p>
              <ul className="ml-4 space-y-1 text-gray-600">
                <li>• Access control enforced cryptographically</li>
                <li>• Failed decryption attempts are logged</li>
                <li>• Uses industry-standard AES-256 + RSA-2048</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}