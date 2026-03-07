VERSION 1.0 CLASS
BEGIN
  MultiUse = -1  'True
END
Attribute VB_Name = "ThisDocument"
Attribute VB_GlobalNameSpace = False
Attribute VB_Creatable = False
Attribute VB_PredeclaredId = True
Attribute VB_Exposed = True
Dim X As New MyEventClass
Sub InitializeApp()
    Set X.App = Word.Application
End Sub

Sub AMergeWithForm()
    Dim mailMerge As New MailMergeClass
    
    mailMerge.Start
End Sub


Private Sub SendDocByEmail(doc As Document, recipient As String)

    Dim olApp As Object
    Dim olMail As Object

    Set olApp = CreateObject("Outlook.Application")
    Set olMail = olApp.CreateItem(0)

    doc.ExportAsFixedFormat Environ("TEMP") & "\temp.pdf", wdExportFormatPDF

    With olMail
        .To = recipient
        .subject = "Your document"
        .Body = "Please see attached."
        .Attachments.Add Environ("TEMP") & "\temp.pdf"
        .Send
    End With

End Sub

' Inspector works!!!
Private Sub TESTEmailThisDoc(doc As Document, recipient As String)
    Dim MailItem As Object, Outlook As Object
    Dim Word As Object
    Dim MsgTxt As String
    Set Outlook = CreateObject("Outlook.Application")
    Set MailItem = Outlook.CreateItem(0)
    MsgTxt = doc.Range()
    doc.Content.Copy
    With MailItem
        .To = recipient
        ' .cc = recipient
        .subject = "Test Erik "
        .ReplyRecipients.Add "De muziekschool <erik.bongers@so.antwerpen.be>"
        Set inspector = .GetInspector
        Set mailDoc = inspector.wordeditor
        mailDoc.Content.Paste
        .Display
        .Send
    End With
End Sub


Private Sub EmailThisDoc(doc As Document, recipient As String)
Dim oMailItem As Object, oOLapp As Object
Dim Word As Object, MsgTxt$
Set oOLapp = CreateObject("Outlook.Application")
Set oMailItem = oOLapp.CreateItem(0)
Set Word = CreateObject("word.application")
' Set doc = Word.Documents.Open(FileName:="c:\pub\first2.docm", ReadOnly:=True)
' MsgTxt = doc.Range(Start:=doc.Paragraphs(1).Range.Start, End:=doc.Paragraphs(doc.Paragraphs.Count).Range.End)
MsgTxt = doc.Range()
With oMailItem
    .To = recipient
    .cc = recipient
    .subject = "Test Erik"
    .HTMLBody = Convert2HTML(doc.Range())
    .Display
'    .Send
End With
Set oOLapp = Nothing
Set oMailItem = Nothing
End Sub

Sub TESTSendTestMail()
  TESTEmailThisDoc ActiveDocument, "erikbongers@outlook.com"
End Sub

' Source - https://stackoverflow.com/a/63470622
' Posted by Edson, modified by community. See post 'Timeline' for change history
' Retrieved 2026-03-06, License - CC BY-SA 4.0

Function ConvertExcelCell2HTML(myCell As Range) As String
    Dim bldTagOn, itlTagOn, ulnTagOn, colTagOn, phaTagOn As Boolean
    Dim i, chrCount, spaceCount As Integer
    Dim chrCol, chrLastCol, htmlTxt As String

    bldTagOn = False
    itlTagOn = False
    ulnTagOn = False
    colTagOn = False
    phaTagOn = False
    chrCol = "NONE"
    htmlTxt = "<div>"
    chrCount = myCell.Characters.Count
    spaceCount = 0
    For i = 1 To chrCount
        With myCell.Characters(i, 1)

            If myCell.Characters(i, 4).Text = "    " And Not phaTagOn Then
                htmlTxt = htmlTxt & "<p style='text-indent: 40px'>"
                phaTagOn = True
            Else
                If myCell.Characters(i, 4).Text = "    " And phaTagOn Then
                    htmlTxt = htmlTxt & "</p><p style='text-indent: 40px'>"
                    phaTagOn = True
                End If
            End If

            If (.Font.Color) Then
                chrCol = GetCol(.Font.Color)
                If Not colTagOn Then
                    htmlTxt = htmlTxt & "<font color=#" & chrCol & ">"
                    colTagOn = True
                Else
                    If chrCol <> chrLastCol Then htmlTxt = htmlTxt & "</font><font color=#" & chrCol & ">"
                End If
            Else
                chrCol = "NONE"
                If colTagOn Then
                    htmlTxt = htmlTxt & "</font>"
                    colTagOn = False
                End If
            End If
            chrLastCol = chrCol

            If .Font.Bold = True Then
                If Not bldTagOn Then
                    htmlTxt = htmlTxt & "<b>"
                    bldTagOn = True
                End If
            Else
                If bldTagOn Then
                    htmlTxt = htmlTxt & "</b>"
                    bldTagOn = False
                End If
            End If

            If .Font.Italic = True Then
                If Not itlTagOn Then
                    htmlTxt = htmlTxt & "<i>"
                    itlTagOn = True
                End If
            Else
                If itlTagOn Then
                    htmlTxt = htmlTxt & "</i>"
                    itlTagOn = False
                End If
            End If

            If .Font.Underline > 0 Then
                If Not ulnTagOn Then
                    htmlTxt = htmlTxt & "<u>"
                    ulnTagOn = True
                End If
            Else
                If ulnTagOn Then
                    htmlTxt = htmlTxt & "</u>"
                    ulnTagOn = False
                End If
            End If

            If (Asc(.Text) = 10) Then
                htmlTxt = htmlTxt & "<br>"
            Else
                htmlTxt = htmlTxt & .Text
            End If
        End With
    Next

    If colTagOn Then
        htmlTxt = htmlTxt & "</font>"
        colTagOn = False
    End If
    If bldTagOn Then
        htmlTxt = htmlTxt & "</b>"
        bldTagOn = False
    End If
    If itlTagOn Then
        htmlTxt = htmlTxt & "</i>"
        itlTagOn = False
    End If
    If ulnTagOn Then
        htmlTxt = htmlTxt & "</u>"
        ulnTagOn = False
    End If
    If phaTagOn Then
        htmlTxt = htmlTxt & "</p>"
        phaTagOn = False
    End If
    htmlTxt = htmlTxt & "</div>"
    fnConvert2HTML = htmlTxt
End Function

Function GetCol(strCol As String) As String
    Dim rVal, gVal, bVal As String
    strCol = Right("000000" & Hex(strCol), 6)
    bVal = Left(strCol, 2)
    gVal = Mid(strCol, 3, 2)
    rVal = Right(strCol, 2)
    GetCol = rVal & gVal & bVal
End Function



