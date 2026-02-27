import express from "express"
import { PrismaClient } from "@prisma/client"

const app = express()
const prisma = new PrismaClient()

app.use(express.json())

app.post("/identify", async (req, res) => {
  const { email, phoneNumber } = req.body

  if (!email && !phoneNumber) {
    return res.status(400).json({
      error: "Either email or phoneNumber must be provided"
    })
  }

  // Find matching contacts
  const matchingContacts = await prisma.contact.findMany({
    where: {
      OR: [
        email ? { email } : undefined,
        phoneNumber ? { phoneNumber } : undefined
      ].filter(Boolean) as any
    },
    orderBy: { createdAt: "asc" }
  })

  // If no match → create primary
  if (matchingContacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "primary"
      }
    })

    return res.json({
      contact: {
        primaryContatctId: newContact.id,
        emails: email ? [email] : [],
        phoneNumbers: phoneNumber ? [phoneNumber] : [],
        secondaryContactIds: []
      }
    })
  }

  // Determine correct primary (oldest)
  const primaryId = Math.min(
    ...matchingContacts.map(c =>
      c.linkPrecedence === "primary" ? c.id : c.linkedId!
    )
  )

  // Convert extra primaries to secondary
  for (const contact of matchingContacts) {
    if (
      contact.linkPrecedence === "primary" &&
      contact.id !== primaryId
    ) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: {
          linkPrecedence: "secondary",
          linkedId: primaryId
        }
      })
    }
  }

  // Fetch all linked contacts
  const allContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: primaryId },
        { linkedId: primaryId }
      ]
    },
    orderBy: { createdAt: "asc" }
  })

  const existingEmails = new Set(
    allContacts.map(c => c.email).filter(Boolean)
  )

  const existingPhones = new Set(
    allContacts.map(c => c.phoneNumber).filter(Boolean)
  )

  // If new info → create secondary
  if (
    (email && !existingEmails.has(email)) ||
    (phoneNumber && !existingPhones.has(phoneNumber))
  ) {
    await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "secondary",
        linkedId: primaryId
      }
    })
  }

  const finalContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: primaryId },
        { linkedId: primaryId }
      ]
    },
    orderBy: { createdAt: "asc" }
  })

  const primary = finalContacts.find(
    c => c.linkPrecedence === "primary"
  )!

  res.json({
    contact: {
      primaryContatctId: primary.id,
      emails: [
        primary.email,
        ...finalContacts
          .filter(c => c.id !== primary.id && c.email)
          .map(c => c.email!)
      ].filter(Boolean),
      phoneNumbers: [
        primary.phoneNumber,
        ...finalContacts
          .filter(c => c.id !== primary.id && c.phoneNumber)
          .map(c => c.phoneNumber!)
      ].filter(Boolean),
      secondaryContactIds: finalContacts
        .filter(c => c.linkPrecedence === "secondary")
        .map(c => c.id)
    }
  })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
