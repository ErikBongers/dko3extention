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
Private StartIndex As Integer

Private Sub Class_Initialize()
    Set progressForm = New frmProgress
    AddSenders
    StartIndex = 1
End Sub

Private Sub AddSenders()
    Dim OutApp As Outlook.Application
    Dim I As Long

    Set OutApp = CreateObject("Outlook.Application")

    For I = 1 To OutApp.Session.Accounts.Count
        AddSender OutApp.Session.Accounts.Item(I).DisplayName, I
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
    Loop Until MergeModifySendAll()
End Sub

Public Sub AddSender(ByVal emailAddress As String, ByVal index As Integer)
    progressForm.AddSender emailAddress, index
End Sub

Private Function GetAccountIndex(ByVal emailAddress As String)
        Dim OutApp As Outlook.Application
    Dim I As Long

    Set OutApp = CreateObject("Outlook.Application")

    For I = 1 To OutApp.Session.Accounts.Count
        If OutApp.Session.Accounts.Item(I).DisplayName = emailAddress Then
            GetAccountIndex = I
            Exit For
        End If
    Next I
End Function

Private Function MergeModifySendAll()
    Dim I As Long
    Dim recCount As Long
    Dim mergedDoc As Document
    Dim email As String
    Dim SenderIndex As Integer

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
    
    For I = StartIndex To recCount
        StartIndex = I
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

        EmailThisDoc mergedDoc, email, "Start schooljaar voor " & voornaam, SenderIndex, wordDocs, attachments

        mergedDoc.Close SaveChanges:=False
    Next I
    
    progressForm.SetInfo "Finished!"
    MergeModifySendAll = True
End Function


Private Sub EmailThisDoc(doc As Document, recipients As String, subject As String, senderAccountNo As Integer, wordDocs() As String, attachments() As String)
    Dim MailItem As Object, Outlook As Object
    Dim Word As Object
    Dim OutAccount As Outlook.Account
    Dim arrRecipients() As String
    
    Set Outlook = CreateObject("Outlook.Application")
    Set MailItem = Outlook.CreateItem(0)
    Set OutAccount = Outlook.Session.Accounts.Item(senderAccountNo)
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
