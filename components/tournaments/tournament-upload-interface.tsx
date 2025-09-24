'use client'

import { useState, useRef, useEffect } from 'react'
import { trpc } from '@/lib/trpc/client'
import { useFormDraftStore } from '@/stores/form-draft-store'
import { useAsyncOperationEnhanced } from '@/hooks/stores/use-loading-store-enhanced'

interface Tournament {
  id: string
  name: string
  status: string // API returns string, will be one of 'UPCOMING' | 'ACTIVE' | 'COMPLETED'
}

interface TournamentUploadInterfaceProps {
  tournament?: Tournament
}

type FileType = 'CSV' | 'JSON' | 'TDF'

interface UploadError {
  message: string
  line?: number
  field?: string
}

export function TournamentUploadInterface({ tournament }: TournamentUploadInterfaceProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([])
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use form draft store for auto-save functionality
  const { saveDraft, loadDraft, getDraftLastSaved } = useFormDraftStore()
  const { execute, isLoading: isUploading } = useAsyncOperationEnhanced('tournament-upload')
  
  const draftId = 'tournament-upload'

  const utils = trpc.useUtils()

  // Initialize form data from draft
  const [formData, setFormData] = useState<{ fileType: FileType }>({ fileType: 'CSV' })
  const fileType = formData.fileType

  // Load draft on mount
  useEffect(() => {
    const savedDraft = loadDraft(draftId)
    if (savedDraft?.data) {
      setFormData(savedDraft.data)
    }
  }, [loadDraft, draftId])

  // Auto-save form data
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (fileType) {
        saveDraft(draftId, { fileType })
      }
    }, 1000)
    
    return () => clearTimeout(timeoutId)
  }, [fileType, saveDraft, draftId])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setUploadErrors([])
      setUploadSuccess(false)
      
      // Auto-detect file type based on extension
      const extension = file.name.split('.').pop()?.toUpperCase()
      if (extension === 'CSV' || extension === 'JSON' || extension === 'TDF') {
        const newFileType = extension as FileType
        setFormData({ fileType: newFileType })
        saveDraft(draftId, { fileType: newFileType })
      }
    }
  }

  const validateFile = (file: File): UploadError[] => {
    const errors: UploadError[] = []
    
    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      errors.push({
        message: 'File size must be less than 10MB'
      })
    }
    
    // Check file type
    const allowedTypes = ['text/csv', 'application/json', 'text/plain']
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|json|tdf)$/i)) {
      errors.push({
        message: 'File must be CSV, JSON, or TDF format'
      })
    }
    
    return errors
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    const validationErrors = validateFile(selectedFile)
    if (validationErrors.length > 0) {
      setUploadErrors(validationErrors)
      return
    }

    await execute(async () => {
      // Read file content
      const fileContent = await readFileContent(selectedFile)
      
      // Validate and parse content based on file type
      const parsedData = await parseFileContent(fileContent, fileType)
      
      // TODO: Send to tRPC endpoint for processing
      // For now, simulate upload
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      setUploadSuccess(true)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      
      // Refresh tournament data if tournament is provided
      if (tournament) {
        utils.tournaments.getById.invalidate({ id: tournament.id })
      }
    }).catch((error) => {
      setUploadErrors([{
        message: error instanceof Error ? error.message : 'Upload failed'
      }])
    })
  }

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  const parseFileContent = async (content: string, type: FileType) => {
    switch (type) {
      case 'CSV':
        return parseCSV(content)
      case 'JSON':
        return parseJSON(content)
      case 'TDF':
        return parseTDF(content)
      default:
        throw new Error('Unsupported file type')
    }
  }

  const parseCSV = (content: string) => {
    const lines = content.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row')
    }
    
    const headers = lines[0].split(',').map(h => h.trim())
    const requiredHeaders = ['player1', 'player2', 'winner', 'round']
    
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`)
    }
    
    // Parse data rows
    const data = lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim())
      const row: Record<string, string> = {}
      
      headers.forEach((header, i) => {
        row[header] = values[i] || ''
      })
      
      // Validate required fields
      requiredHeaders.forEach(header => {
        if (!row[header]) {
          throw new Error(`Missing ${header} in row ${index + 2}`)
        }
      })
      
      return row
    })
    
    return data
  }

  const parseJSON = (content: string) => {
    try {
      const data = JSON.parse(content)
      
      if (!Array.isArray(data)) {
        throw new Error('JSON file must contain an array of match results')
      }
      
      // Validate each match result
      data.forEach((match, index) => {
        const requiredFields = ['player1', 'player2', 'winner', 'round']
        requiredFields.forEach(field => {
          if (!match[field]) {
            throw new Error(`Missing ${field} in match ${index + 1}`)
          }
        })
      })
      
      return data
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON format')
      }
      throw error
    }
  }

  const parseTDF = (content: string) => {
    // TDF (Tab Delimited Format) parsing
    const lines = content.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      throw new Error('TDF file must have at least a header row and one data row')
    }
    
    const headers = lines[0].split('\t').map(h => h.trim())
    const requiredHeaders = ['player1', 'player2', 'winner', 'round']
    
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h))
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`)
    }
    
    const data = lines.slice(1).map((line, index) => {
      const values = line.split('\t').map(v => v.trim())
      const row: Record<string, string> = {}
      
      headers.forEach((header, i) => {
        row[header] = values[i] || ''
      })
      
      requiredHeaders.forEach(header => {
        if (!row[header]) {
          throw new Error(`Missing ${header} in row ${index + 2}`)
        }
      })
      
      return row
    })
    
    return data
  }

  const clearFile = () => {
    setSelectedFile(null)
    setUploadErrors([])
    setUploadSuccess(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="tournament-upload-interface">
      <div className="upload-header">
        <h3>Upload Tournament Results</h3>
        <p>Upload match results and tournament data from your tournament software.</p>
      </div>

      <div className="upload-section">
        <div className="file-type-selector">
          <label>File Format:</label>
          <div className="file-type-options">
            {(['CSV', 'JSON', 'TDF'] as FileType[]).map((type) => (
              <label key={type} className="file-type-option">
                <input
                  type="radio"
                  name="fileType"
                  value={type}
                  checked={fileType === type}
                  onChange={(e) => {
                    const newFileType = e.target.value as FileType
                    setFormData({ fileType: newFileType })
                    saveDraft(draftId, { fileType: newFileType })
                  }}
                />
                <span>{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="file-upload-area">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.tdf"
            onChange={handleFileSelect}
            className="file-input"
            id="tournament-file"
          />
          <label htmlFor="tournament-file" className="file-upload-label">
            <div className="upload-icon">📁</div>
            <div className="upload-text">
              {selectedFile ? selectedFile.name : 'Choose file or drag and drop'}
            </div>
            <div className="upload-hint">
              Supported formats: CSV, JSON, TDF (Max 10MB)
            </div>
          </label>
        </div>

        {selectedFile && (
          <div className="file-info">
            <div className="file-details">
              <span className="file-name">{selectedFile.name}</span>
              <span className="file-size">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <button onClick={clearFile} className="clear-file-btn">
              Remove
            </button>
          </div>
        )}

        {/* Draft indicator */}
        {getDraftLastSaved(draftId) && (
          <div className="draft-indicator">
            💾 Draft saved {new Date(getDraftLastSaved(draftId)!).toLocaleTimeString()}
          </div>
        )}

        <div className="upload-actions">
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="upload-btn"
          >
            {isUploading ? 'Uploading...' : 'Upload Results'}
          </button>
        </div>
      </div>

      {/* Upload Status */}
      {uploadSuccess && (
        <div className="upload-success">
          <div className="success-icon">✅</div>
          <div className="success-message">
            <h4>Upload Successful!</h4>
            <p>Tournament results have been processed and updated.</p>
          </div>
        </div>
      )}

      {uploadErrors.length > 0 && (
        <div className="upload-errors">
          <div className="error-icon">❌</div>
          <div className="error-content">
            <h4>Upload Errors</h4>
            <ul className="error-list">
              {uploadErrors.map((error, index) => (
                <li key={index} className="error-item">
                  {error.line && <span className="error-line">Line {error.line}: </span>}
                  {error.field && <span className="error-field">{error.field}: </span>}
                  <span className="error-message">{error.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Format Examples */}
      <div className="format-examples">
        <h4>File Format Examples</h4>
        
        <div className="format-tabs">
          <div className="format-example">
            <h5>CSV Format</h5>
            <pre className="format-code">
{`player1,player2,winner,round,table
John Doe,Jane Smith,John Doe,1,1
Alice Johnson,Bob Wilson,Bob Wilson,1,2`}
            </pre>
          </div>
          
          <div className="format-example">
            <h5>JSON Format</h5>
            <pre className="format-code">
{`[
  {
    "player1": "John Doe",
    "player2": "Jane Smith", 
    "winner": "John Doe",
    "round": 1,
    "table": 1
  }
]`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}