VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "MailMergeClass"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = False
Attribute VB_Exposed = False
Private progressForm As frmProgress

Private Sub Class_Initialize()
    Set progressForm = New frmProgress
End Sub

Sub Start()
    progressForm.Show False
    progressForm.StopRequested = True
    Do
        DoEvents
        If progressForm.StopRequested = False Then
            Exit Do
        End If
    Loop
    MergeModifySendAll
End Sub

Private Sub MergeModifySendAll()
    Dim i As Long
    Dim recCount As Long
    Dim mergedDoc As Document
    Dim email As String

    recCount = ActiveDocument.mailMerge.DataSource.RecordCount
    If recCount = -1 Then
        MsgBox "No records found. Make sure the mail merge document is the active document or reset the mail merge source."
        Exit Sub
    End If
    
    progressForm.SetInfo "Starting mail merge..."
    progressForm.MaxProgressValue = recCount
    
    Set insertMeDoc = Documents.Open(FileName:="C:\Users\erikb\Desktop\InsertMe.docx", ReadOnly:=True, Visible:=False)

    For i = 1 To recCount
        DoEvents
        If progressForm.StopRequested = True Then
            progressForm.SetInfo "Stopped by user"
            Exit Sub
        End If
        
        progressForm.SetProgress i

        With ActiveDocument.mailMerge
            .DataSource.FirstRecord = i
            .DataSource.LastRecord = i
            .DataSource.ActiveRecord = i
            .Destination = wdSendToNewDocument
            email = .DataSource.DataFields("email").value
            .Execute Pause:=False
        End With

        Set mergedDoc = ActiveDocument

        ' Stick it to the end of the mail merge doc
        Set docRange = mergedDoc.Content
        docRange.Collapse Direction:=wdCollapseEnd
        docRange.FormattedText = insertMeDoc.Content

        EmailThisDoc mergedDoc, email, "Test Erik..."

        mergedDoc.Close SaveChanges:=False
    Next i
End Sub


Private Sub EmailThisDoc(doc As Document, recipients As String, subject As String)
    Dim MailItem As Object, Outlook As Object
    Dim Word As Object
    Dim MsgTxt As String
    Set Outlook = CreateObject("Outlook.Application")
    Set MailItem = Outlook.CreateItem(0)
    Dim arrRecipients() As String
    
    arrRecipients = Split(recipients, ";")
    
    MsgTxt = doc.Range()
    doc.Content.Copy
    With MailItem
        For Each recipient In arrRecipients
            .recipients.Add recipient
        Next recipient
        .subject = subject
        .ReplyRecipients.Add "Academie Berchem <academie.berchem.muziek.woord@stedelijkonderwijs.be>"
        Set inspector = .GetInspector
        Set mailDoc = inspector.wordeditor
        mailDoc.Content.Paste
        .Display
        .Send
    End With
End Sub


