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
Private startIndex As Integer
Private Outlook As Object

Private Sub Class_Initialize()
    Set progressForm = New frmProgress
    Set Outlook = CreateObject("Outlook.Application")
    AddSenders
    startIndex = 1
End Sub

Private Sub AddSenders()
    Dim I As Long

    For I = 1 To Outlook.Session.Accounts.Count
        AddSender Outlook.Session.Accounts.Item(I).DisplayName, I
    Next I
End Sub

Sub Start()
    progressForm.Show False
    progressForm.StopRequested = True
    Do
        Do
            DoEvents
            If progressForm.StopRequested = False Then
                Exit Do
            End If
        Loop
    Loop Until MergeModifySendAll(CInt(progressForm.txtStart.value))
End Sub

Public Sub AddSender(ByVal emailAddress As String, ByVal index As Integer)
    progressForm.AddSender emailAddress, index
End Sub

Private Function GetAccountIndex(ByVal emailAddress As String)
    Dim I As Long

    For I = 1 To Outlook.Session.Accounts.Count
        If Outlook.Session.Accounts.Item(I).DisplayName = emailAddress Then
            GetAccountIndex = I
            Exit For
        End If
    Next I
End Function

Private Function MergeModifySendAll(startIndex As Integer)
    Dim I As Long
    Dim recCount As Long
    Dim mergedDoc As Document
    Dim email As String
    Dim SenderIndex As Integer
    Dim OutAccount As Outlook.Account

    recCount = ActiveDocument.mailMerge.DataSource.RecordCount
    If recCount = -1 Then
        MsgBox "No records found. Make sure the mail merge document is the active document or reset the mail merge source."
        MergeModifySendAll = True ' returning True to end the loop
        Exit Function
    End If
    
    If progressForm.SenderAccount = "" Then
        MsgBox "Select a sender."
        MergeModifySendAll = False
        Exit Function
    End If
    
    SenderIndex = GetAccountIndex(progressForm.SenderAccount)
    
    progressForm.SetInfo "Starting mail merge..."
    progressForm.MaxProgressValue = recCount
    
    lastFieldName = ActiveDocument.mailMerge.DataSource.DataFields(ActiveDocument.mailMerge.DataSource.DataFields.Count).Name
    lastFieldName = Replace(lastFieldName, "vestiging", "")
    numberOfVestigingen = GetNumbers(lastFieldName, 0)
    
    Set OutAccount = Outlook.Session.Accounts.Item(SenderIndex)
    For I = startIndex To recCount
        startIndex = I
        DoEvents
        If progressForm.StopRequested = True Then
            progressForm.SetInfo "Stopped by user"
            MergeModifySendAll = False
            Exit Function
        End If
        
        progressForm.SetProgress I

        With ActiveDocument.mailMerge
            .DataSource.FirstRecord = I
            .DataSource.LastRecord = I
            .DataSource.ActiveRecord = I
            .Destination = wdSendToNewDocument
            email = .DataSource.DataFields("email").value
            naam = .DataSource.DataFields("naam").value
            voornaam = .DataSource.DataFields("voornaam").value
            Dim wordDocs() As String
            ReDim wordDocs(numberOfVestigingen - 1)
            Dim attachments() As String
            ReDim attachments(numberOfVestigingen - 1)
            For idxDoc = 1 To numberOfVestigingen
                wordDoc = .DataSource.DataFields("vestiging" & idxDoc & "_wordDoc").value
                wordDocs(idxDoc - 1) = wordDoc
                Attachment = .DataSource.DataFields("vestiging" & idxDoc & "_bijlage").value
                attachments(idxDoc - 1) = Attachment
            Next idxDoc
            .Execute Pause:=False
        End With

        Set mergedDoc = ActiveDocument

        EmailThisDoc Outlook, OutAccount, mergedDoc, email, "Start schooljaar voor " & voornaam, SenderIndex, wordDocs, attachments

        mergedDoc.Close SaveChanges:=False
    Next I
    
    progressForm.SetInfo "Finished!"
    MergeModifySendAll = True
End Function


Private Sub EmailThisDoc(Outlook As Object, OutAccount As Outlook.Account, doc As Document, recipients As String, subject As String, senderAccountNo As Integer, wordDocs() As String, attachments() As String)
    Dim MailItem As Object
    Dim Word As Object
    Dim arrRecipients() As String
    
    Set MailItem = Outlook.CreateItem(0)
    'arrRecipients = Split(recipients, ";")
    arrRecipients = Split("erikbongers@outlook.com", ";")
    
    For Each wordDoc In wordDocs
        If wordDoc <> "" Then
            Set insertMeDoc = Documents.Open(FileName:=wordDoc, ReadOnly:=True, Visible:=False)
            ' Stick it to the end of the mail merge doc
            Set docRange = doc.Content
            docRange.Collapse Direction:=wdCollapseEnd
            docRange.FormattedText = insertMeDoc.Content
        End If
    Next wordDoc
    
    doc.Content.Copy
    With MailItem
        Set .SendUsingAccount = OutAccount
        For Each recipient In arrRecipients
            .recipients.Add recipient
        Next recipient
        .subject = subject
        .ReplyRecipients.Add "Academie Berchem <academie.berchem.muziek.woord@stedelijkonderwijs.be>"
        Set inspector = .GetInspector
        Set mailDoc = inspector.wordeditor
        mailDoc.Content.Paste
    
        For Each Attachment In attachments
            If Attachment <> "" Then
                .attachments.Add Attachment, olByValue, 1
            End If
        Next Attachment

        .Display
        .Send
    End With
End Sub

Function GetNumbers(ByVal str As String, Occur As Long) As Long
    Dim regex As Object: Set regex = CreateObject("vbscript.RegExp")
    regex.Pattern = "(\d+)"
    regex.Global = True
    Set matches = regex.Execute(str)
    GetNumbers = matches(Occur)
End Function

