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
Private Outlook As Object

Private Sub Class_Initialize()
    Set progressForm = New frmProgress
    Set Outlook = CreateObject("Outlook.Application")
    AddSenders
End Sub

Private Sub AddSenders()
    Dim I As Long

    For I = 1 To Outlook.Session.Accounts.Count
        AddSender Outlook.Session.Accounts.Item(I).DisplayName, I
    Next I
End Sub

Sub start()
    progressForm.Show False
    progressForm.StopRequested = True
    Do
        Do
            DoEvents
            If progressForm.StopRequested = False Then
                Exit Do
            End If
        Loop
    Loop Until MergeModifySaveAll(CInt(progressForm.txtStart.value))
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

Private Function MergeModifySaveAll(startIndex As Integer)
    Dim I As Long
    Dim recCount As Long
    Dim mergedDoc As Document
    Dim email As String
    Dim SenderIndex As Integer
    Dim OutAccount As Outlook.Account
    Dim dataSourceFileName As String
    Dim fileIdxStr As String

    dataSourceFileName = "C:\Users\erikb\Desktop\TestDataMailMergeV2.xlsm"
    OpenDataSource dataSourceFileName, 666, 100
    
    recCount = ActiveDocument.mailMerge.DataSource.RecordCount
    If recCount = -1 Then
        MsgBox "No records found. Make sure the mail merge document is the active document or reset the mail merge source."
        MergeModifySaveAll = True ' returning True to end the loop
        Exit Function
    End If
    
    If progressForm.SenderAccount = "" Then
        MsgBox "Select a sender."
        MergeModifySaveAll = False
        Exit Function
    End If
    
    progressForm.SetInfo "Starting mail merge..."
    progressForm.MaxProgressValue = recCount
    
    
    lastFieldName = ActiveDocument.mailMerge.DataSource.DataFields(ActiveDocument.mailMerge.DataSource.DataFields.Count).Name
    lastFieldName = Replace(lastFieldName, "vestiging", "")
    numberOfVestigingen = GetNumbers(lastFieldName, 0)
    
    For I = startIndex To recCount
        startIndex = I
        DoEvents
        If progressForm.StopRequested = True Then
            progressForm.SetInfo "Stopped by user"
            MergeModifySaveAll = False
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
            fileIdxStr = .DataSource.DataFields("Idx").value
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

        ExpandMailDoc mergedDoc, email, "Start schooljaar voor " & voornaam, wordDocs, attachments
        mergedDoc.SaveAs2 "C:\Users\erikb\Desktop\Merged\File" & fileIdxStr & ".docx"
        mergedDoc.Close SaveChanges:=False
    Next I
    
    progressForm.SetInfo "Finished!"
    MergeModifySaveAll = True
End Function


Private Sub ExpandMailDoc(doc As Document, recipients As String, subject As String, wordDocs() As String, attachments() As String)
    Dim MailItem As Object
    Dim Word As Object
    Dim arrRecipients() As String
    
    Set MailItem = Outlook.CreateItem(0)
    'arrRecipients = Split(recipients, ";")
    arrRecipients = Split("erikbongers@outlook.com", ";")
    
    For Each wordDoc In wordDocs
        If wordDoc <> "" Then
            Set insertMeDoc = Documents.Open(fileName:=wordDoc, ReadOnly:=True, Visible:=False)
            ' Stick it to the end of the mail merge doc
            Set docRange = doc.Content
            docRange.Collapse Direction:=wdCollapseEnd
            docRange.FormattedText = insertMeDoc.Content
        End If
    Next wordDoc
    
    Dim strRecipients As String
    strRecipients = ""
    For Each recipient In arrRecipients
        strRecipients = strRecipients & ";" & recipient
    Next recipient
    doc.Variables.Add "Dko3Recepient", strRecipients

    Dim strAtt As String
    strAtt = ""
    For Each Attachment In attachments
        If Attachment <> "" Then
            strAtt = strAtt & ";" & Attachment
        End If
    Next Attachment
    doc.Variables.Add "Dko3Attachments", strAtt
End Sub

Function GetNumbers(ByVal str As String, Occur As Long) As Long
    Dim regex As Object: Set regex = CreateObject("vbscript.RegExp")
    regex.Pattern = "(\d+)"
    regex.Global = True
    Set matches = regex.Execute(str)
    GetNumbers = matches(Occur)
End Function

Private Sub SendMailDocs()
' TODO: loop
    Dim MailItem As Object
    Dim Word As Object
    Dim arrRecipients() As String
    
    Set MailItem = Outlook.CreateItem(0)
    'arrRecipients = Split(recipients, ";")
    arrRecipients = Split("erikbongers@outlook.com", ";")
    
    For Each wordDoc In wordDocs
        If wordDoc <> "" Then
            Set insertMeDoc = Documents.Open(fileName:=wordDoc, ReadOnly:=True, Visible:=False)
            ' Stick it to the end of the mail merge doc
            Set docRange = doc.Content
            docRange.Collapse Direction:=wdCollapseEnd
            docRange.FormattedText = insertMeDoc.Content
        End If
    Next wordDoc
    
    doc.Content.Copy
    doc.Close SaveChanges:=False

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

Sub OpenDataSource(fileName As String, startIdx As Integer, idxCnt As Integer)
    Dim maxIdx As Integer
    
    maxIdx = startIdx + idxCnt
    ActiveDocument.mailMerge.OpenDataSource Name:=fileName, _
        ConfirmConversions:=False, _
        ReadOnly:=False, _
        LinkToSource:=True, _
        AddToRecentFiles:=False, _
        PasswordDocument:="", _
        PasswordTemplate:="", _
        WritePasswordDocument:="", _
        WritePasswordTemplate:="", _
        Revert:=False, _
        Format:=wdOpenFormatAuto, _
        Connection:= _
        "Provider=Microsoft.ACE.OLEDB.12.0;User ID=Admin;Data Source=" & fileName & ";Mode=Read;Extended Properties=""HDR=YES;IMEX=1;"";Jet OLEDB:System database="""";Jet OLEDB:Registry Path="""";Jet OLEDB:Engine Type=37;Jet OLEDB:Database" _
        , _
        SQLStatement:="SELECT * FROM `MAILMERGE$` where Idx >= " & CStr(startIdx) & " and Idx < " & CStr(maxIdx), _
        SQLStatement1:="", _
        SubType:=wdMergeSubTypeAccess
End Sub


