VERSION 5.00
Begin {C62A69F0-16DC-11CE-9E98-00AA00574A4F} frmProgress 
   Caption         =   "Mail merge"
   ClientHeight    =   3015
   ClientLeft      =   120
   ClientTop       =   465
   ClientWidth     =   4560
   OleObjectBlob   =   "frmProgress.frx":0000
   StartUpPosition =   1  'CenterOwner
End
Attribute VB_Name = "frmProgress"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = False
Public StopRequested As Boolean
Public MaxProgressValue As Integer
Public WorkerCallbackName As String
Private progressValue As Integer

Private Sub cmdStart_Click()
    Application.Run WorkerCallbackName
End Sub

Private Sub cmdStop_Click()
    StopRequested = True
End Sub

Private Sub UserForm_Initialize()
    StopRequested = False
    MaxProgressValue = 5
    progressValue = 0
    UpdateProgressWidth
End Sub

Public Sub SetInfo(info As String)
    lblInfo.Caption = info
End Sub

Public Sub SetProgress(value As Integer)
    progressValue = value
    UpdateProgressWidth
End Sub

Private Sub UpdateProgressWidth()
    Dim newWidth As Double
    
    If progressValue = 0 Then
        newWidth = 1
    Else
        newWidth = (value / MaxProgressValue) * lblProgBack.Width
    End If
    
    lblProgBar.Width = newWidth
End Sub
